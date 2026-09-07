from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    User,
    Category,
    Complaint,
    ComplaintAttachment,
    ComplaintStatusHistory,
    Notification,
    Comment,
    Review,
    ResidentRegistry,
    Announcement,
    ScheduledWork,
    FAQArticle,
    AuditLog,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "first_name", "last_name", "email", "role", "room_number", "telephone")
    list_filter = ("role", "is_active_resident")
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Hostel Info",
            {
                "fields": (
                    "role",
                    "room_number",
                    "telephone",
                    "profile_picture",
                    "category_specialization",
                    "is_active_resident",
                    "notify_in_app",
                    "notify_email_status",
                    "notify_email_announcements",
                )
            },
        ),
    )

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")


class ComplaintAttachmentInline(admin.TabularInline):
    model = ComplaintAttachment
    extra = 0


class ComplaintStatusHistoryInline(admin.TabularInline):
    model = ComplaintStatusHistory
    extra = 0
    readonly_fields = ("changed_by", "old_status", "new_status", "note", "changed_at")


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "category", "resident", "status", "priority", "assigned_to", "created_at")
    list_filter = ("status", "category", "priority")
    search_fields = ("title", "description", "resident__username", "room_number")
    inlines = [ComplaintAttachmentInline, ComplaintStatusHistoryInline]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "notification_type", "message", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("recipient__username", "message")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("complaint", "author", "text", "created_at")
    search_fields = ("text", "author__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("complaint", "resident", "rating", "created_at")
    list_filter = ("rating",)


@admin.register(ResidentRegistry)
class ResidentRegistryAdmin(admin.ModelAdmin):
    list_display = ("email", "telephone", "first_name", "last_name", "room_number", "is_active")
    search_fields = ("email", "telephone", "first_name", "last_name", "room_number")
    list_filter = ("is_active",)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "created_by", "is_pinned", "is_active", "created_at")
    list_filter = ("is_pinned", "is_active")


@admin.register(ScheduledWork)
class ScheduledWorkAdmin(admin.ModelAdmin):
    list_display = ("title", "start_at", "end_at", "affected_blocks", "is_cancelled")
    list_filter = ("is_cancelled", "category")


@admin.register(FAQArticle)
class FAQArticleAdmin(admin.ModelAdmin):
    list_display = ("question", "category", "is_published", "order")
    list_filter = ("is_published", "category")
    search_fields = ("question", "answer")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "object_type", "object_id")
    list_filter = ("action", "object_type")
    search_fields = ("detail", "actor__username")
    readonly_fields = (
        "actor",
        "action",
        "object_type",
        "object_id",
        "detail",
        "ip_address",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
