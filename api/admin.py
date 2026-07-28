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