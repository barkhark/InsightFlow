"""
InsightFlow — NotificationService

Pure Python service — no HTTP coupling.
Called by WorkflowEngine after every transition.
Also called directly by comment/attachment views.

Design: Every notification has a title (for the bell badge list)
and a message (for the detail panel). Both are always human-readable.
"""
from django.utils import timezone
from .models import Notification


class NotificationService:
    """
    Creates targeted Notification records for relevant users with multi-channel dispatch.
    All methods are safe to call inside an existing transaction.
    """

    @staticmethod
    def _build_dispatch_channels(recipient, title, message, n_type):
        """Generates simulated multi-channel dispatch audit metadata."""
        now_str = timezone.now().isoformat()
        email = getattr(recipient, 'email', 'user@insightflow.edu')
        # Deterministic dummy phone based on user id or role
        phone_suffix = str(abs(hash(str(recipient.id))))[-4:].zfill(4)
        phone = f'+91 98200 {phone_suffix}'

        return {
            'in_app': {
                'status': 'delivered',
                'timestamp': now_str,
            },
            'email': {
                'status': 'delivered',
                'recipient': email,
                'subject': title,
                'provider': 'Institutional Mail Relay (SMTP/SES)',
                'timestamp': now_str,
            },
            'sms': {
                'status': 'dispatched',
                'phone': phone,
                'provider': 'Campus SMS Gateway',
                'timestamp': now_str,
            },
            'erp_sync': {
                'status': 'synced',
                'system': 'University ERP / SIS Connector',
                'event_type': n_type,
                'timestamp': now_str,
            },
        }

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
            delivery_channels=self._build_dispatch_channels(student, title, message, n_type),
        )

    def notify_assignment(self, service_request, assigned_to, assigned_by):
        """Notify a staff member when a request is assigned to them."""
        title = f'Request assigned: {service_request.reference_number}'
        message = (
            f'You have been assigned to handle '
            f'"{service_request.title}" ({service_request.reference_number}). '
            f'Current stage: {service_request.current_stage.name}.'
        )
        n_type = Notification.NotificationType.REQUEST_ASSIGNED
        Notification.objects.create(
            recipient=assigned_to,
            request=service_request,
            notification_type=n_type,
            title=title,
            message=message,
            delivery_channels=self._build_dispatch_channels(assigned_to, title, message, n_type),
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
                title = f'New comment on {service_request.reference_number}'
                message = (
                    f'{comment.author.full_name} added a comment to '
                    f'"{service_request.title}".'
                )
                n_type = Notification.NotificationType.COMMENT_ADDED
                Notification.objects.create(
                    recipient=current_assignment.assigned_to,
                    request=service_request,
                    notification_type=n_type,
                    title=title,
                    message=message,
                    delivery_channels=self._build_dispatch_channels(current_assignment.assigned_to, title, message, n_type),
                )
        elif not comment.is_internal:
            # Staff posted public comment — notify student
            title = f'Staff reply on {service_request.reference_number}'
            message = (
                f'{comment.author.full_name} replied to your request '
                f'"{service_request.title}".'
            )
            n_type = Notification.NotificationType.COMMENT_ADDED
            Notification.objects.create(
                recipient=service_request.student,
                request=service_request,
                notification_type=n_type,
                title=title,
                message=message,
                delivery_channels=self._build_dispatch_channels(service_request.student, title, message, n_type),
            )

    def notify_sla_warning(self, service_request, stage, elapsed_pct: float):
        """Notify the assigned staff member of an approaching SLA deadline."""
        current_assignment = service_request.assignments.filter(is_current=True).first()
        if not current_assignment:
            return
        title = f'SLA Warning: {service_request.reference_number}'
        message = (
            f'Request "{service_request.title}" has used '
            f'{elapsed_pct:.0f}% of the SLA time for '
            f'the "{stage.name}" stage. Please take action soon.'
        )
        n_type = Notification.NotificationType.SLA_WARNING
        Notification.objects.create(
            recipient=current_assignment.assigned_to,
            request=service_request,
            notification_type=n_type,
            title=title,
            message=message,
            delivery_channels=self._build_dispatch_channels(current_assignment.assigned_to, title, message, n_type),
        )

    def notify_feedback_received(self, service_request, feedback):
        """Notify assigned staff or department admin when student submits feedback."""
        current_assignment = service_request.assignments.filter(is_current=True).first()
        recipient = current_assignment.assigned_to if current_assignment else None
        if not recipient:
            return
        title = f'CSAT Feedback ({feedback.rating}★) on {service_request.reference_number}'
        message = (
            f'{service_request.student.full_name} rated their experience '
            f'{feedback.rating}/5 stars for "{service_request.title}". '
            f'Tags: {", ".join(feedback.tags) if feedback.tags else "None"}.'
        )
        n_type = Notification.NotificationType.FEEDBACK_RECEIVED
        Notification.objects.create(
            recipient=recipient,
            request=service_request,
            notification_type=n_type,
            title=title,
            message=message,
            delivery_channels=self._build_dispatch_channels(recipient, title, message, n_type),
        )

