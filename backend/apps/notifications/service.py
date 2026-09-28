"""
InsightFlow — NotificationService

Pure Python service — no HTTP coupling.
Called by WorkflowEngine after every transition.
Also called directly by comment/attachment views.

Design: Every notification has a title (for the bell badge list)
and a message (for the detail panel). Both are always human-readable.
"""
from .models import Notification


class NotificationService:
    """
    Creates targeted Notification records for relevant users.
    All methods are safe to call inside an existing transaction.
    """

    def notify_stage_transition(self, service_request, old_stage, new_stage, actor):
        """Notify the student when their request moves to a new stage."""
        student = service_request.student
        is_rejection = new_stage.is_rejection
        is_resolved = new_stage.is_terminal and not is_rejection

        if is_rejection:
            n_type = Notification.NotificationType.REQUEST_REJECTED
            title = f'Your request has been rejected'
            message = (
                f'Your request "{service_request.title}" '
                f'({service_request.reference_number}) has been reviewed and '
                f'could not be processed at this time. '
                f'Please check the request timeline for details.'
            )
        elif is_resolved:
            n_type = Notification.NotificationType.REQUEST_RESOLVED
            title = f'Your request has been resolved'
            message = (
                f'Great news! Your request "{service_request.title}" '
                f'({service_request.reference_number}) has been successfully resolved.'
            )
        else:
            n_type = Notification.NotificationType.STAGE_UPDATE
            title = f'Request update: {new_stage.name}'
            message = (
                f'Your request "{service_request.title}" '
                f'({service_request.reference_number}) has moved to the '
                f'"{new_stage.name}" stage and is being processed by '
                f'{new_stage.responsible_department.name}.'
            )

        Notification.objects.create(
            recipient=student,
            request=service_request,
            notification_type=n_type,
            title=title,
            message=message,
        )

    def notify_assignment(self, service_request, assigned_to, assigned_by):
        """Notify a staff member when a request is assigned to them."""
        Notification.objects.create(
            recipient=assigned_to,
            request=service_request,
            notification_type=Notification.NotificationType.REQUEST_ASSIGNED,
            title=f'Request assigned: {service_request.reference_number}',
            message=(
                f'You have been assigned to handle '
                f'"{service_request.title}" ({service_request.reference_number}). '
                f'Current stage: {service_request.current_stage.name}.'
            ),
        )

    def notify_comment_added(self, comment):
        """
        Notify relevant parties when a new comment is posted.
        - If student posted: notify all current assigned staff.
        - If staff posted (non-internal): notify the student.
        """
        service_request = comment.request

        if comment.author.role == 'student':
            # Notify currently assigned staff
            current_assignment = service_request.assignments.filter(is_current=True).first()
            if current_assignment:
                Notification.objects.create(
                    recipient=current_assignment.assigned_to,
                    request=service_request,
                    notification_type=Notification.NotificationType.COMMENT_ADDED,
                    title=f'New comment on {service_request.reference_number}',
                    message=(
                        f'{comment.author.full_name} added a comment to '
                        f'"{service_request.title}".'
                    ),
                )
        elif not comment.is_internal:
            # Staff posted public comment — notify student
            Notification.objects.create(
                recipient=service_request.student,
                request=service_request,
                notification_type=Notification.NotificationType.COMMENT_ADDED,
                title=f'Staff reply on {service_request.reference_number}',
                message=(
                    f'{comment.author.full_name} replied to your request '
                    f'"{service_request.title}".'
                ),
            )

    def notify_sla_warning(self, service_request, stage, elapsed_pct: float):
        """Notify the assigned staff member of an approaching SLA deadline."""
        current_assignment = service_request.assignments.filter(is_current=True).first()
        if not current_assignment:
            return
        Notification.objects.create(
            recipient=current_assignment.assigned_to,
            request=service_request,
            notification_type=Notification.NotificationType.SLA_WARNING,
            title=f'SLA Warning: {service_request.reference_number}',
            message=(
                f'Request "{service_request.title}" has used '
                f'{elapsed_pct:.0f}% of the SLA time for '
                f'the "{stage.name}" stage. Please take action soon.'
            ),
        )
