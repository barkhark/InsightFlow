"""
InsightFlow — Service Request API Serializers

CreateRequestSerializer:  POST /api/v1/requests/
TransitionSerializer:     POST /api/v1/requests/{id}/transition/
RequestListSerializer:    GET  /api/v1/requests/  (lightweight — list view)
RequestDetailSerializer:  GET  /api/v1/requests/{id}/ (full — includes timeline)
StageHistorySerializer:   embedded in RequestDetail
AuditRecordSerializer:    embedded in RequestDetail
CommentSerializer:        GET/POST /api/v1/requests/{id}/comments/
NotificationSerializer:   GET /api/v1/notifications/
"""
from rest_framework import serializers
from django.utils import timezone

from apps.requests.models import ServiceRequest, RequestStageHistory, RequestFeedback
from apps.services.models import ServiceCategory, ServiceArea, DynamicFieldSchema
from apps.workflows.models import WorkflowStage
from apps.audit.models import AuditRecord
from apps.comments.models import Comment
from apps.attachments.models import Attachment
from apps.notifications.models import Notification
from apps.accounts.serializers import UserMeSerializer
from core.sla_engine import SLAEngine
from core.predictive_engine import PredictiveEngine
from core.erp_service import ERPIntegrationService



# ── Service Area & Category ─────────────────────────────────

class DynamicFieldSchemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicFieldSchema
        fields = [
            'id', 'field_key', 'field_label', 'field_type',
            'options_json', 'is_required', 'order', 'help_text', 'placeholder'
        ]


class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ['id', 'name', 'description', 'icon_key', 'order']


class ServiceCategoryListSerializer(serializers.ModelSerializer):
    service_area_name = serializers.CharField(source='service_area.name', read_only=True)
    department_name = serializers.CharField(source='owning_department.name', read_only=True)

    class Meta:
        model = ServiceCategory
        fields = [
            'id', 'name', 'description', 'service_area_name',
            'department_name', 'default_priority', 'requires_attachment'
        ]


class ServiceCategoryDetailSerializer(serializers.ModelSerializer):
    """Full category detail — includes dynamic field schema for form rendering."""
    service_area = ServiceAreaSerializer(read_only=True)
    dynamic_fields = DynamicFieldSchemaSerializer(many=True, read_only=True)
    department_name = serializers.CharField(source='owning_department.name', read_only=True)

    class Meta:
        model = ServiceCategory
        fields = [
            'id', 'name', 'description', 'service_area',
            'department_name', 'default_priority', 'requires_attachment', 'dynamic_fields'
        ]


# ── Workflow Stage ──────────────────────────────────────────

class WorkflowStageSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='responsible_department.name', read_only=True)
    sla_target_hours = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowStage
        fields = [
            'id', 'name', 'code', 'order', 'is_initial', 'is_terminal',
            'is_rejection', 'department_name', 'sla_target_hours'
        ]

    def get_sla_target_hours(self, obj):
        try:
            return float(obj.sla_config.target_hours)
        except Exception:
            return None


# ── Stage History ───────────────────────────────────────────

class StageHistorySerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    stage_code = serializers.CharField(source='stage.code', read_only=True)
    transitioned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestStageHistory
        fields = [
            'id', 'stage_name', 'stage_code', 'entered_at', 'exited_at',
            'duration_minutes', 'sla_breached', 'transitioned_by_name', 'transition_note'
        ]

    def get_transitioned_by_name(self, obj):
        return obj.transitioned_by.full_name if obj.transitioned_by else None


# ── Audit Records ───────────────────────────────────────────

class AuditRecordSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditRecord
        fields = ['id', 'action', 'description', 'metadata_json', 'timestamp', 'actor_name']

    def get_actor_name(self, obj):
        return obj.actor.full_name if obj.actor else 'System'


# ── Comments ────────────────────────────────────────────────

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'body', 'author_name', 'author_role', 'is_internal', 'created_at']
        read_only_fields = ['id', 'author_name', 'author_role', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        # Students cannot post internal comments
        if request and request.user.role == 'student' and attrs.get('is_internal'):
            raise serializers.ValidationError(
                {'is_internal': 'Students cannot post internal comments.'}
            )
        return attrs


# ── Attachments ─────────────────────────────────────────────

class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = Attachment
        fields = [
            'id', 'original_filename', 'file_size_mb',
            'mime_type', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = fields


# ── Service Request — Create ────────────────────────────────

class CreateRequestSerializer(serializers.ModelSerializer):
    """
    Used by students to submit a new service request.
    Dynamic field values are validated against the category's DynamicFieldSchema.
    """
    dynamic_fields_data = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = ServiceRequest
        fields = ['service_category', 'title', 'details', 'dynamic_fields_data']

    def validate_service_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError('This service category is currently unavailable.')
        if not value.workflow.is_active:
            raise serializers.ValidationError(
                'The workflow for this service category is inactive.'
            )
        return value

    def validate(self, attrs):
        category = attrs.get('service_category')
        dynamic_data = attrs.get('dynamic_fields_data', {})

        if category:
            required_fields = category.dynamic_fields.filter(is_required=True)
            missing = []
            for field in required_fields:
                val = dynamic_data.get(field.field_key)
                if val is None or (isinstance(val, str) and not val.strip()):
                    missing.append(field.field_label)
            if missing:
                raise serializers.ValidationError({
                    'dynamic_fields_data': f'Required fields missing: {", ".join(missing)}'
                })
        return attrs


# ── Service Request — Transition ────────────────────────────

class TransitionSerializer(serializers.Serializer):
    """
    Staff submits this to advance a request to the next stage.
    """
    target_stage_id = serializers.UUIDField()
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')

    def validate_target_stage_id(self, value):
        try:
            stage = WorkflowStage.objects.get(id=value, status='active')
        except WorkflowStage.DoesNotExist:
            raise serializers.ValidationError('Target stage not found or is not active.')
        return stage


# ── Service Request — List ──────────────────────────────────

class RequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views — includes live SLA, risk, and health."""
    service_category_name = serializers.CharField(source='service_category.name', read_only=True)
    department_name = serializers.CharField(source='service_category.owning_department.name', read_only=True)
    current_stage_name = serializers.SerializerMethodField()
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    sla = serializers.SerializerMethodField()
    risk = serializers.SerializerMethodField()
    health = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'reference_number', 'title', 'status', 'priority',
            'service_category_name', 'department_name', 'current_stage_name',
            'student_name', 'created_at', 'updated_at', 'sla', 'risk', 'health'
        ]

    def get_current_stage_name(self, obj):
        return obj.current_stage.name if obj.current_stage else None

    def get_sla(self, obj):
        if obj.is_terminal:
            return None
        try:
            return SLAEngine().compute_stage_sla(obj).to_dict()
        except Exception:
            return None

    def get_risk(self, obj):
        try:
            return SLAEngine().compute_request_risk(obj)
        except Exception:
            return {'risk_level': 'low', 'explanation': 'Normal processing.'}

    def get_health(self, obj):
        try:
            return SLAEngine().compute_request_health(obj)
        except Exception:
            return {'score': 100, 'status': 'healthy', 'summary': 'On track', 'penalties': []}


# ── Request Feedback (CSAT) ─────────────────────────────────

class RequestFeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    reference_number = serializers.CharField(source='request.reference_number', read_only=True)

    class Meta:
        model = RequestFeedback
        fields = [
            'id', 'rating', 'speed_rating', 'helpfulness_rating',
            'clarity_rating', 'comment', 'tags', 'student_name',
            'reference_number', 'created_at'
        ]
        read_only_fields = ['id', 'student_name', 'reference_number', 'created_at']

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


# ── Service Request — Detail ────────────────────────────────

class RequestDetailSerializer(serializers.ModelSerializer):
    """Full request detail — includes all related data, responsibility ledger, health diagnostics, predictive ETA, and ERP verification."""
    service_category = ServiceCategoryListSerializer(read_only=True)
    current_stage = WorkflowStageSerializer(read_only=True)
    student = UserMeSerializer(read_only=True)
    stage_history = StageHistorySerializer(many=True, read_only=True)
    audit_records = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    allowed_transitions = serializers.SerializerMethodField()
    sla = serializers.SerializerMethodField()
    risk = serializers.SerializerMethodField()
    health = serializers.SerializerMethodField()
    responsibility_ledger = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    predictive_forecast = serializers.SerializerMethodField()
    erp_verification = serializers.SerializerMethodField()
    verification_digest = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'reference_number', 'title', 'details', 'status', 'priority',
            'dynamic_fields_data', 'service_category', 'current_stage', 'student',
            'stage_history', 'audit_records', 'comments', 'attachments',
            'allowed_transitions', 'sla', 'risk', 'health', 'responsibility_ledger',
            'feedback', 'predictive_forecast', 'erp_verification', 'verification_digest',
            'created_at', 'updated_at', 'resolved_at'
        ]

    def get_audit_records(self, obj):
        request = self.context.get('request')
        qs = obj.audit_records.all()
        if request and request.user.role == 'student':
            qs = qs.filter(is_student_visible=True)
        return AuditRecordSerializer(qs, many=True).data

    def get_comments(self, obj):
        request = self.context.get('request')
        qs = obj.comments.filter(is_deleted=False)
        if request and request.user.role == 'student':
            qs = qs.filter(is_internal=False)
        return CommentSerializer(qs, many=True).data

    def get_allowed_transitions(self, obj):
        request = self.context.get('request')
        if not request or request.user.role == 'student':
            return []
        if obj.is_terminal or not obj.current_stage:
            return []
        return WorkflowStageSerializer(
            obj.current_stage.allowed_next_stages.filter(status='active'),
            many=True
        ).data

    def get_sla(self, obj):
        if obj.is_terminal:
            return None
        try:
            return SLAEngine().compute_stage_sla(obj).to_dict()
        except Exception:
            return None

    def get_risk(self, obj):
        try:
            return SLAEngine().compute_request_risk(obj)
        except Exception:
            return {'risk_level': 'low', 'explanation': 'On track'}

    def get_health(self, obj):
        try:
            return SLAEngine().compute_request_health(obj)
        except Exception:
            return {'score': 100, 'status': 'healthy', 'summary': 'On track', 'penalties': []}

    def get_responsibility_ledger(self, obj):
        try:
            return SLAEngine().get_responsibility_ledger(obj)
        except Exception:
            return {}

    def get_feedback(self, obj):
        try:
            if hasattr(obj, 'feedback'):
                return RequestFeedbackSerializer(obj.feedback).data
        except Exception:
            pass
        return None

    def get_predictive_forecast(self, obj):
        try:
            return PredictiveEngine.predict_request_completion(obj)
        except Exception:
            return None

    def get_erp_verification(self, obj):
        try:
            return ERPIntegrationService.get_student_erp_profile(obj.student)
        except Exception:
            return None

    def get_verification_digest(self, obj):
        try:
            return ERPIntegrationService.generate_verification_digest(obj)
        except Exception:
            return None


# ── Notifications ───────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    request_reference = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'is_read', 'delivery_channels', 'created_at', 'request_reference'
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'delivery_channels', 'created_at']

    def get_request_reference(self, obj):
        return obj.request.reference_number if obj.request else None

