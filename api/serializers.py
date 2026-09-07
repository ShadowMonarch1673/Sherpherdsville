from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    Announcement,
    AuditLog,
    Category,
    Comment,
    Complaint,
    ComplaintAttachment,
    ComplaintStatus,
    ComplaintStatusHistory,
    FAQArticle,
    Notification,
    Review,
    ScheduledWork,
    User,
)
from .triage import analyze_complaint


MAX_IMAGE_SIZE = 5 * 1024 * 1024


def validate_image_size(image):
    if image and image.size > MAX_IMAGE_SIZE:
        raise serializers.ValidationError("Images must be no larger than 5 MB.")
    return image


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(read_only=True)
    is_specialist = serializers.BooleanField(read_only=True)
    is_staff_operator = serializers.BooleanField(read_only=True)
    category_specialization_id = serializers.IntegerField(read_only=True, allow_null=True)
    category_specialization_name = serializers.CharField(
        source="category_specialization.name", read_only=True, allow_null=True
    )
    has_usable_password = serializers.SerializerMethodField()
    profile_picture = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_image_size]
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "telephone",
            "room_number",
            "role",
            "profile_picture",
            "is_admin",
            "is_specialist",
            "is_staff_operator",
            "category_specialization_id",
            "category_specialization_name",
            "has_usable_password",
            "notify_in_app",
            "notify_email_status",
            "notify_email_announcements",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "room_number",
            "role",
            "is_admin",
            "is_specialist",
            "is_staff_operator",
            "category_specialization_id",
            "category_specialization_name",
            "has_usable_password",
        ]

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(validators=[validate_password])


class ComplaintAttachmentMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintAttachment
        fields = ["id", "image", "uploaded_at"]


class ComplaintStatusHistoryMiniSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintStatusHistory
        fields = [
            "id",
            "old_status",
            "new_status",
            "note",
            "changed_by_name",
            "changed_at",
        ]

    def get_changed_by_name(self, obj):
        return str(obj.changed_by) if obj.changed_by else "System"


class ComplaintSerializer(serializers.ModelSerializer):
    resident = serializers.StringRelatedField(read_only=True)
    resident_id = serializers.IntegerField(source="resident.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    attachments = ComplaintAttachmentMiniSerializer(many=True, read_only=True)
    status_history = ComplaintStatusHistoryMiniSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    sla_hours = serializers.IntegerField(read_only=True)
    class Meta:
        model = Complaint
        fields = [
            "id",
            "resident",
            "resident_id",
            "category",
            "category_name",
            "title",
            "description",
            "room_number",
            "status",
            "priority",
            "assigned_to",
            "assigned_to_name",
            "resolution_notes",
            "resolution_image",
            "reopen_count",
            "attachments",
            "status_history",
            "comments_count",
            "has_review",
            "is_overdue",
            "sla_hours",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "resident",
            "resident_id",
            "room_number",
            "priority",
            "status",
            "assigned_to",
            "resolution_notes",
            "resolution_image",
            "reopen_count",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_assigned_to_name(self, obj):
        return str(obj.assigned_to) if obj.assigned_to else None

    def get_has_review(self, obj):
        return hasattr(obj, "review")

    def create(self, validated_data):
        user = self.context["request"].user
        if not user.room_number:
            raise serializers.ValidationError(
                {"room_number": "Your room number has not been assigned. Contact an administrator."}
            )
        validated_data["room_number"] = user.room_number
        validated_data["priority"] = analyze_complaint(
            validated_data.get("title", ""), validated_data.get("description", "")
        )["priority"]
        validated_data["resident"] = user
        return super().create(validated_data)


class ComplaintStatusUpdateSerializer(serializers.ModelSerializer):
    resolution_image = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_image_size]
    )

    class Meta:
        model = Complaint
        fields = [
            "status",
            "priority",
            "assigned_to",
            "resolution_notes",
            "resolution_image",
        ]

    def validate_assigned_to(self, user):
        complaint = self.instance
        if user and not user.is_staff_operator:
            raise serializers.ValidationError("Complaints can only be assigned to staff.")
        if (
            user
            and user.is_specialist
            and complaint
            and user.category_specialization_id != complaint.category_id
        ):
            raise serializers.ValidationError(
                "This specialist does not handle the complaint category."
            )
        return user


class ComplaintAttachmentSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(validators=[validate_image_size])

    class Meta:
        model = ComplaintAttachment
        fields = ["id", "complaint", "image", "uploaded_at"]
        read_only_fields = ["id", "complaint", "uploaded_at"]


class NotificationSerializer(serializers.ModelSerializer):
    complaint_id = serializers.IntegerField(
        source="complaint.id", read_only=True, allow_null=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "complaint_id",
            "message",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "notification_type",
            "complaint_id",
            "message",
            "created_at",
        ]


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.IntegerField(source="author.id", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "complaint", "author", "author_id", "text", "created_at"]
        read_only_fields = ["id", "complaint", "author", "author_id", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    resident = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "complaint", "resident", "rating", "feedback", "created_at"]
        read_only_fields = ["id", "complaint", "resident", "created_at"]


class RequestOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r"^\d{6}$")


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active"]


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "content",
            "created_by",
            "created_by_name",
            "is_pinned",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return str(obj.created_by) if obj.created_by else "System"


class ScheduledWorkSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name", read_only=True, allow_null=True
    )
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledWork
        fields = [
            "id",
            "title",
            "description",
            "category",
            "category_name",
            "affected_blocks",
            "start_at",
            "end_at",
            "is_cancelled",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        start = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end = attrs.get("end_at", getattr(self.instance, "end_at", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_at": "End time must follow start time."})
        return attrs

    def get_created_by_name(self, obj):
        return str(obj.created_by) if obj.created_by else None


class FAQArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQArticle
        fields = [
            "id",
            "question",
            "answer",
            "category",
            "is_published",
            "order",
            "created_at",
            "updated_at",
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_name",
            "action",
            "object_type",
            "object_id",
            "detail",
            "ip_address",
            "created_at",
        ]

    def get_actor_name(self, obj):
        return str(obj.actor) if obj.actor else "System"
