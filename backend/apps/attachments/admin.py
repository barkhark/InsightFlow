from django.contrib import admin
from .models import Attachment

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['request', 'original_filename', 'uploaded_by', 'file_size_mb', 'uploaded_at']
    search_fields = ['request__reference_number', 'original_filename']
    ordering = ['-uploaded_at']
    readonly_fields = ['id', 'uploaded_at', 'file_size_bytes']
