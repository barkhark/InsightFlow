from django.contrib import admin
from .models import Comment

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['request', 'author', 'is_internal', 'is_deleted', 'created_at']
    list_filter = ['is_internal', 'is_deleted']
    search_fields = ['request__reference_number', 'author__email']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at']
