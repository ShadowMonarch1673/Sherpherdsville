from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    RESIDENT = "RESIDENT", "Resident"
    ADMIN = "ADMIN", "Admin"
    ELECTRICIAN = "ELECTRICIAN", "Electrician"
    PLUMBER = "PLUMBER", "Plumber"
    CARPENTER = "CARPENTER", "Carpenter"
    CLEANER = "CLEANER", "Cleaner"
    SECURITY = "SECURITY", "Security"


SPECIALIST_ROLES = (
    Role.ELECTRICIAN,
    Role.PLUMBER,
    Role.CARPENTER,
    Role.CLEANER,
    Role.SECURITY,
)

phone_validator = RegexValidator(
    regex=r"^\+?[0-9\s\-()]{7,20}$",
    message="Enter a valid telephone number.",
)


class User(AbstractUser):
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.RESIDENT)
    room_number = models.CharField(max_length=20, blank=True, null=True)
    telephone = models.CharField(max_length=20, validators=[phone_validator], blank=True)
    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/%Y/%m/", blank=True, null=True
    )
    category_specialization = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialists",
        help_text="For staff and admin roles only. This is the category they resolve complaints for.",
    )
    is_active_resident = models.BooleanField(
        default=True,
        help_text="Flip to False when a resident moves out, instead of deleting the account.",
    )
    notify_in_app = models.BooleanField(default=True)
    notify_email_status = models.BooleanField(default=True)
    notify_email_announcements = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == Role.ADMIN or self.is_superuser

    @property
    def is_specialist(self):
        return self.role in SPECIALIST_ROLES

    @property
    def is_staff_operator(self):
        return self.is_admin or self.is_specialist


class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ComplaintStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    REJECTED = "REJECTED", "Rejected"


class ComplaintPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class Complaint(models.Model):
    SLA_HOURS = {
        ComplaintPriority.URGENT: 4,
        ComplaintPriority.HIGH: 24,
        ComplaintPriority.MEDIUM: 72,
        ComplaintPriority.LOW: 168,
    }

    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_filed",
        limit_choices_to={"role": Role.RESIDENT},
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="complaints"
    )
    title = models.CharField(max_length=150)
    description = models.TextField()
    room_number = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.PENDING
    )
    priority = models.CharField(
        max_length=10,
        choices=ComplaintPriority.choices,
        default=ComplaintPriority.MEDIUM,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints_assigned",
        limit_choices_to={"role__in": [Role.ADMIN, *SPECIALIST_ROLES]},
    )
    resolution_notes = models.TextField(blank=True)
    resolution_image = models.ImageField(
        upload_to="resolution_images/%Y/%m/", blank=True, null=True
    )
    reopen_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["resident"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title}: {self.status}"

    @property
    def sla_hours(self):
        return self.SLA_HOURS.get(self.priority, 72)

    @property
    def is_overdue(self):
        if self.status in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
            return False
        return timezone.now() > self.created_at + timedelta(hours=self.sla_hours)


class ComplaintAttachment(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="attachments"
    )
    image = models.ImageField(upload_to="complaint_attachments/%Y/%m/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for Complaint #{self.complaint_id}"


class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="status_history"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="complaint_status_changes",
    )
    old_status = models.CharField(
        max_length=20, choices=ComplaintStatus.choices, blank=True
    )
    new_status = models.CharField(max_length=20, choices=ComplaintStatus.choices)
    note = models.CharField(max_length=255, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]
        verbose_name_plural = "Complaint status histories"

    def __str__(self):
        return f"Complaint #{self.complaint_id}: {self.old_status} → {self.new_status}"


class NotificationType(models.TextChoices):
    NEW_COMPLAINT = "NEW_COMPLAINT", "New Complaint"
    STATUS_CHANGE = "STATUS_CHANGE", "Status Change"
    ANNOUNCEMENT = "ANNOUNCEMENT", "Announcement"


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=20, choices=NotificationType.choices
    )
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"To {self.recipient}: {self.message}"


class Comment(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on Complaint #{self.complaint_id}"


class Review(models.Model):
    complaint = models.OneToOneField(
        Complaint, on_delete=models.CASCADE, related_name="review"
    )
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review for Complaint #{self.complaint_id}: {self.rating}/5"


class OTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["email", "code", "is_used"], name="api_otp_lookup_idx"
            )
        ]

    def __str__(self):
        return f"OTP for {self.email} ({'used' if self.is_used else 'active'})"


class ResidentRegistry(models.Model):
    """Local fallback for installations without a separate resident database."""

    email = models.EmailField(unique=True)
    telephone = models.CharField(
        max_length=20, unique=True, validators=[phone_validator], blank=True, null=True
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    room_number = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}: {self.room_number}"


class Announcement(models.Model):
    title = models.CharField(max_length=150)
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="announcements_created",
    )
    is_pinned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return self.title


class ScheduledWork(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_works",
    )
    affected_blocks = models.CharField(max_length=255, blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_cancelled = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scheduled_works_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_at"]

    def __str__(self):
        return self.title


class FAQArticle(models.Model):
    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "question"]

    def __str__(self):
        return self.question


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_entries",
    )
    action = models.CharField(max_length=50)
    object_type = models.CharField(max_length=100)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    detail = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action}: {self.object_type} #{self.object_id or '-'}"
