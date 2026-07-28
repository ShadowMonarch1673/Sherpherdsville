from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, Role, Complaint, ComplaintAttachment, Notification, Comment, Review


class UserSerializer(serializers.ModelSerializer):
    """Used to display a user's own profile (e.g. GET /me/)."""

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
        ]
        read_only_fields = ["id", "role"]  # residents can't self-promote to Admin


class RegisterSerializer(serializers.ModelSerializer):
    """Used for POST /register/ — residents signing themselves up."""

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "telephone",
            "room_number",
        ]

    def create(self, validated_data):
        # Anyone who registers through this public endpoint becomes a
        # Resident. Admin accounts are created separately (createsuperuser,
        # or later, by an existing Admin).
        user = User(
            username=validated_data["username"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            email=validated_data["email"],
            telephone=validated_data.get("telephone", ""),
            room_number=validated_data.get("room_number", ""),
            role=Role.RESIDENT,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class ComplaintSerializer(serializers.ModelSerializer):
    resident = serializers.StringRelatedField(read_only=True)
    resident_id = serializers.IntegerField(source="resident.id", read_only=True)
    room_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "resident",
            "resident_id",
            "category",
            "title",
            "description",
            "room_number",
            "status",
            "priority",
            "assigned_to",
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "resident",
            "resident_id",
            "status",
            "assigned_to",
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        # room_number defaults to the resident's own room if not provided
        validated_data.setdefault("room_number", user.room_number or "")
        validated_data["resident"] = user
        return super().create(validated_data)


class ComplaintStatusUpdateSerializer(serializers.ModelSerializer):
    """Used by Admins to update status/assignment/notes only."""

    class Meta:
        model = Complaint
        fields = ["status", "priority", "assigned_to", "resolution_notes"]


class ComplaintAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintAttachment
        fields = ["id", "complaint", "image", "uploaded_at"]
        read_only_fields = ["id", "complaint", "uploaded_at"]


class NotificationSerializer(serializers.ModelSerializer):
    complaint_id = serializers.IntegerField(source="complaint.id", read_only=True, allow_null=True)

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
        read_only_fields = ["id", "notification_type", "complaint_id", "message", "created_at"]


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