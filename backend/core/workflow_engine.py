"""
InsightFlow — WorkflowEngine

The central business logic service for request lifecycle management.

Design principles:
  1. Pure Python service — no Django HTTP coupling (no request/response objects).
     Can be tested independently without an HTTP client.
  2. All transitions are atomic — wrapped in django.db.transaction.atomic().
  3. Every transition creates: RequestStageHistory update + new entry, AuditRecord,
     and triggers NotificationService (Phase 4).
  4. Validation is explicit — can_transition() returns (bool, reason) so the
     caller always knows WHY a transition was refused.
  5. Rejection path (Q2) is a first-class transition — treated identically to
     forward transitions but targets a stage where is_rejection=True.

Usage:
    engine = WorkflowEngine()
    ok, reason = engine.can_transition(request, target_stage, actor)
    if ok:
        history = engine.execute_transition(request, target_stage, actor, note="...")
"""
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class WorkflowValidationError(Exception):
    """Raised when a workflow transition is invalid."""
    pass


class WorkflowEngine:
    """
    Manages all ServiceRequest lifecycle transitions.

    Import within methods to avoid circular imports at module load time.
    """

    # ── Stage resolution ────────────────────────────────────

    def get_initial_stage(self, workflow):
        """
        Return the initial stage of the given workflow.
        Raises WorkflowValidationError if none found.
        """
        stage = workflow.stages.filter(is_initial=True).first()
        if stage is None:
            raise WorkflowValidationError(
                f'Workflow "{workflow.name}" has no initial stage configured.'
            )
        return stage

    def get_allowed_transitions(self, service_request):
        """
        Return the list of stages this request can legally move to from its current stage.
        Returns an empty queryset for terminal stages.
        """
        if service_request.current_stage is None:
            return []
        return list(service_request.current_stage.allowed_next_stages.filter(
            status='active'
        ))

    # ── Validation ──────────────────────────────────────────

    def can_transition(self, service_request, target_stage, actor) -> tuple[bool, str]:
        """
        Check whether a transition from current stage to target_stage is legal.

        Returns:
            (True, "") if allowed.
            (False, reason_string) if refused — reason is human-readable.

        Checks (in order):
          1. Request is not in a terminal status.
          2. target_stage is in allowed_next_stages of current_stage.
          3. actor has permission for target_stage.responsible_department.
        """
        # 1. Terminal status check
        if service_request.is_terminal:
            return False, (
                f'Request {service_request.reference_number} is already {service_request.status}. '
                f'Terminal requests cannot be transitioned.'
            )

        # 2. Allowed transition check
        allowed = self.get_allowed_transitions(service_request)
        allowed_ids = {s.id for s in allowed}
        if target_stage.id not in allowed_ids:
            allowed_names = ', '.join(s.name for s in allowed) or 'none'
            return False, (
                f'Transition from "{service_request.current_stage.name}" to '
                f'"{target_stage.name}" is not permitted. '
                f'Allowed next stages: {allowed_names}.'
            )

        # 3. Actor department authorization
        if actor.role == 'admin':
            return True, ''  # Admins can transition any stage

        if actor.role != 'staff':
            return False, 'Only staff and admin users may transition workflow stages.'

        try:
            actor_dept_id = actor.staff_profile.department_id
        except Exception:
            return False, f'Staff member {actor.full_name} has no department assigned.'

        if target_stage.responsible_department_id != actor_dept_id:
            return False, (
                f'{actor.full_name} belongs to department '
                f'"{actor.staff_profile.department.name}" but stage '
                f'"{target_stage.name}" is owned by '
                f'"{target_stage.responsible_department.name}".'
            )

        return True, ''

    # ── Transition execution ────────────────────────────────

    @transaction.atomic
    def execute_transition(
        self,
        service_request,
        target_stage,
        actor,
        note: str = '',
        notify: bool = True
    ):
        """
        Execute a validated workflow transition atomically.

        Side effects (all within one transaction):
          1. Close the current RequestStageHistory entry
             (set exited_at, duration_minutes, sla_breached).
          2. Update ServiceRequest.current_stage, stage_entered_at, status.
          3. Open a new RequestStageHistory entry for the target_stage.
          4. Create an AuditRecord.
          5. Trigger NotificationService (Phase 4 — deferred until that phase).

        Args:
            service_request: The ServiceRequest being transitioned.
            target_stage: The WorkflowStage to move to.
            actor: The User performing the transition.
            note: Optional reason/note for the transition.
            notify: If True, trigger notifications (disabled in tests for isolation).

        Returns:
            The new RequestStageHistory entry.

        Raises:
            WorkflowValidationError: If can_transition() returns False.
        """
        from apps.requests.models import RequestStageHistory
        from apps.audit.models import AuditRecord

        # Validate before touching the database
        ok, reason = self.can_transition(service_request, target_stage, actor)
        if not ok:
            raise WorkflowValidationError(reason)

        now = timezone.now()
        old_stage = service_request.current_stage

        # 1. Close the current stage history entry
        current_history = RequestStageHistory.objects.filter(
            request=service_request,
            exited_at__isnull=True
        ).first()

        if current_history:
            current_history.exited_at = now
            duration = int((now - current_history.entered_at).total_seconds() / 60)
            current_history.duration_minutes = duration

            # Check SLA breach
            sla_breached = False
            try:
                sla = current_history.stage.sla_config
                target_minutes = float(sla.target_hours) * 60
                sla_breached = duration > target_minutes
            except Exception:
                pass  # No SLA config for this stage — not a breach

            current_history.sla_breached = sla_breached
            current_history.transitioned_by = actor
            current_history.transition_note = note
            current_history.save(update_fields=[
                'exited_at', 'duration_minutes', 'sla_breached',
                'transitioned_by', 'transition_note'
            ])

        # 2. Update the ServiceRequest
        new_status = self._derive_status(target_stage)
        service_request.current_stage = target_stage
        service_request.stage_entered_at = now
        service_request.status = new_status
        if target_stage.is_terminal:
            service_request.resolved_at = now
        service_request.save(update_fields=[
            'current_stage', 'stage_entered_at', 'status', 'resolved_at', 'updated_at'
        ])

        # 3. Create the new stage history entry
        new_history = RequestStageHistory.objects.create(
            request=service_request,
            stage=target_stage,
            entered_at=now,
        )

        # 4. Create AuditRecord
        action = (
            AuditRecord.Action.STAGE_REJECTED
            if target_stage.is_rejection
            else AuditRecord.Action.STAGE_TRANSITION
        )
        description = self._build_transition_description(
            service_request, old_stage, target_stage, actor, note, current_history
        )
        AuditRecord.objects.create(
            request=service_request,
            actor=actor,
            action=action,
            description=description,
            metadata_json={
                'from_stage': old_stage.name if old_stage else None,
                'from_stage_code': old_stage.code if old_stage else None,
                'to_stage': target_stage.name,
                'to_stage_code': target_stage.code,
                'is_rejection': target_stage.is_rejection,
                'duration_minutes': current_history.duration_minutes if current_history else None,
                'sla_breached': current_history.sla_breached if current_history else False,
                'note': note,
            },
            is_student_visible=True,
        )

        # 5. Notifications — wired in Phase 4
        if notify:
            self._trigger_notifications(service_request, old_stage, target_stage, actor)

        return new_history

    # ── Request initialisation ──────────────────────────────

    @transaction.atomic
    def initialise_request(self, service_request, creator):
        """
        Called after a ServiceRequest is first created.
        Sets the initial stage and creates the first stage history entry.
        Also creates the REQUEST_CREATED AuditRecord.
        """
        from apps.requests.models import RequestStageHistory
        from apps.audit.models import AuditRecord

        initial_stage = self.get_initial_stage(service_request.workflow)
        now = timezone.now()

        service_request.current_stage = initial_stage
        service_request.stage_entered_at = now
        service_request.status = service_request.Status.OPEN
        service_request.save(update_fields=['current_stage', 'stage_entered_at', 'status'])

        RequestStageHistory.objects.create(
            request=service_request,
            stage=initial_stage,
            entered_at=now,
        )

        AuditRecord.objects.create(
            request=service_request,
            actor=creator,
            action=AuditRecord.Action.REQUEST_CREATED,
            description=(
                f'Request "{service_request.title}" was submitted by '
                f'{creator.full_name}. Assigned to the '
                f'{initial_stage.name} stage owned by '
                f'{initial_stage.responsible_department.name}.'
            ),
            metadata_json={
                'initial_stage': initial_stage.name,
                'initial_stage_code': initial_stage.code,
                'department': initial_stage.responsible_department.name,
                'reference_number': service_request.reference_number,
            },
            is_student_visible=True,
        )

    # ── Private helpers ─────────────────────────────────────

    def _derive_status(self, target_stage) -> str:
        """Determine the coarse status based on the target stage type."""
        from apps.requests.models import ServiceRequest
        if target_stage.is_rejection:
            return ServiceRequest.Status.REJECTED
        if target_stage.is_terminal:
            return ServiceRequest.Status.RESOLVED
        if target_stage.is_initial:
            return ServiceRequest.Status.OPEN
        return ServiceRequest.Status.IN_PROGRESS

    def _build_transition_description(
        self, service_request, old_stage, target_stage, actor, note, history
    ) -> str:
        """Build a human-readable description for the AuditRecord."""
        from_name = old_stage.name if old_stage else 'initial'
        parts = [
            f'Request progressed from "{from_name}" to "{target_stage.name}" '
            f'by {actor.full_name} ({actor.staff_profile.designation if hasattr(actor, "staff_profile") else "Admin"}).'
        ]
        if history and history.duration_minutes is not None:
            hours = history.duration_minutes // 60
            mins = history.duration_minutes % 60
            duration_str = f'{hours}h {mins}m' if hours else f'{mins}m'
            parts.append(f'Time in previous stage: {duration_str}.')
            if history.sla_breached:
                parts.append('⚠ SLA was exceeded for this stage.')
        if target_stage.is_rejection:
            parts.append('Request has been rejected.')
        if target_stage.is_terminal and not target_stage.is_rejection:
            parts.append('Request has been resolved successfully.')
        if note:
            parts.append(f'Note: {note}')
        return ' '.join(parts)

    def _trigger_notifications(self, service_request, old_stage, target_stage, actor):
        """Trigger notifications for student and relevant staff."""
        try:
            from apps.notifications.service import NotificationService
            svc = NotificationService()
            svc.notify_stage_transition(service_request, old_stage, target_stage, actor)
        except Exception:
            # Notification failures must never abort a transition
            pass
