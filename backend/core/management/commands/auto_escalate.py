"""
InsightFlow — Intelligent Priority Auto-Escalation Command

A Django management command that automatically escalates request priority
as SLA deadlines approach. Safe to run on a schedule (e.g., every hour).

Escalation rules (deterministic, auditable):
  - normal  → high:     When elapsed > 75% of stage SLA target
  - high    → critical: When elapsed > 90% of stage SLA target OR stage already breached
  - Also fires a notification to both the student and assigned staff

Usage:
  python manage.py auto_escalate [--dry-run]

Options:
  --dry-run    Print what would be escalated without making changes.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Auto-escalate request priority based on SLA proximity thresholds.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Show what would be escalated without making changes.',
        )

    def handle(self, *args, **options):
        from apps.requests.models import ServiceRequest
        from apps.notifications.models import Notification
        from core.sla_engine import SLAEngine

        dry_run = options['dry_run']
        engine = SLAEngine()
        now = timezone.now()

        escalated = []
        skipped = []

        # Only process active (non-terminal) requests
        active_requests = ServiceRequest.objects.exclude(
            status__in=['resolved', 'rejected', 'closed', 'cancelled']
        ).select_related('current_stage', 'student', 'workflow')

        PRIORITY_LADDER = ['low', 'medium', 'high', 'critical']

        for req in active_requests:
            if not req.current_stage:
                continue

            sla = engine.compute_stage_sla(req)
            elapsed_pct = sla.elapsed_pct

            old_priority = req.priority
            new_priority = old_priority

            # Escalation logic
            if elapsed_pct >= 90 or sla.is_breached:
                # Severe — jump straight to critical if not already
                if PRIORITY_LADDER.index(old_priority) < PRIORITY_LADDER.index('critical'):
                    new_priority = 'critical'
            elif elapsed_pct >= 75:
                # Warning zone — escalate one level
                current_idx = PRIORITY_LADDER.index(old_priority)
                if current_idx < len(PRIORITY_LADDER) - 1:
                    new_priority = PRIORITY_LADDER[current_idx + 1]

            if new_priority == old_priority:
                skipped.append(req.reference_number)
                continue

            escalated.append({
                'reference': req.reference_number,
                'title': req.title,
                'old': old_priority,
                'new': new_priority,
                'elapsed_pct': round(elapsed_pct, 1),
                'req': req,
            })

        self.stdout.write(
            self.style.WARNING(
                f'\n{"[DRY RUN] " if dry_run else ""}Auto-Escalation Report -- {now.strftime("%Y-%m-%d %H:%M")}'
            )
        )
        self.stdout.write(f'  Active requests scanned: {active_requests.count()}')
        self.stdout.write(f'  Escalations identified:  {len(escalated)}')
        self.stdout.write(f'  No change needed:        {len(skipped)}\n')

        for e in escalated:
            self.stdout.write(
                self.style.SUCCESS(
                    f'  {"[DRY RUN] " if dry_run else ""}ESCALATE {e["reference"]}: '
                    f'{e["old"]} -> {e["new"]} '
                    f'(SLA elapsed: {e["elapsed_pct"]}%)'
                )
            )

            if not dry_run:
                req = e['req']
                req.priority = e['new']
                req.save(update_fields=['priority'])

                # Audit log
                from apps.audit.models import AuditRecord
                AuditRecord.objects.create(
                    request=req,
                    actor=None,  # System action
                    action='priority_escalated',
                    notes=(
                        f'[AUTO-ESCALATION] Priority escalated from "{e["old"]}" to "{e["new"]}" '
                        f'by InsightFlow Auto-Escalation Engine. '
                        f'SLA elapsed: {e["elapsed_pct"]}% at stage "{req.current_stage.name}".'
                    ),
                )

                # Notification to student
                Notification.objects.create(
                    recipient=req.student,
                    request=req,
                    notification_type='priority_escalated',
                    title=f'Request {req.reference_number} Priority Escalated',
                    message=(
                        f'Your request "{req.title}" has been automatically escalated to '
                        f'{e["new"].upper()} priority as it approaches the SLA deadline. '
                        f'The responsible team has been notified to expedite processing.'
                    ),
                    delivery_channels=['in_app'],
                )

                # Notification to assigned staff (if any)
                current_assignment = req.assignments.filter(is_current=True).select_related('assigned_to').first()
                if current_assignment and current_assignment.assigned_to:
                    Notification.objects.create(
                        recipient=current_assignment.assigned_to,
                        request=req,
                        notification_type='priority_escalated',
                        title=f'Action Required: {req.reference_number} Escalated to {e["new"].upper()}',
                        message=(
                            f'Request "{req.title}" assigned to you has been auto-escalated '
                            f'to {e["new"].upper()} priority (SLA at {e["elapsed_pct"]}%). '
                            f'Immediate action required.'
                        ),
                        delivery_channels=['in_app'],
                    )

        if not dry_run and escalated:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n[OK] {len(escalated)} request(s) escalated successfully with audit logs and notifications.'
                )
            )
        elif dry_run:
            self.stdout.write(
                self.style.WARNING('\n(Dry run -- no changes were made.)')
            )
        else:
            self.stdout.write(self.style.SUCCESS('\n[OK] All requests are within acceptable priority levels.'))
