from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MaxValueValidator, MinValueValidator
from django.db import models


# ─────────────────────────────────────────────
# USER / ROLES
# ─────────────────────────────────────────────

class Role(models.TextChoices):
    RESIDENT = "RESIDENT", "Resident"
    ADMIN = "ADMIN", "Admin"
    # Future roles — add here when needed:
    # ELECTRICIAN = "ELECTRICIAN", "Electrician"
    # CARPENTER = "CARPENTER", "Carpenter"
    # PLUMBER = "PLUMBER", "Plumber"


phone_validator = RegexValidator(
    regex=r"^\+?[0-9\s\-()]{7,20}$",
    message="Enter a valid telephone number.",
)


class User(AbstractUser):
    """
    Custom user model for the whole app.
    AbstractUser already gives us: first_name, last_name, email, username,
    password, is_staff, is_superuser, etc.
    """

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.RESIDENT)
    room_number = models.CharField(max_length=20, blank=True, null=True)
    telephone = models.CharField(max_length=20, validators=[phone_validator], blank=True)
    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/%Y/%m/", blank=True, null=True
    )

    # For future specialized admins (Electrician, Carpenter, ...).
    # Stays null for the current single super-admin.
    category_specialization = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialists",
        help_text="For staff/admin roles only — the category they resolve complaints for.",
    )

    is_active_resident = models.BooleanField(
        default=True,
        help_text="Flip to False when a resident moves out, instead of deleting the account.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def is_admin(self):
        return self.role == Role.ADMIN or self.is_superuser


# ─────────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────────

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
# COMPLAINTS
# ─────────────────────────────────────────────

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
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="complaints_filed",
        limit_choices_to={"role": "RESIDENT"},
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="complaints")

    title = models.CharField(max_length=150)
    description = models.TextField()

    # Snapshot of the room at time of filing (resident may move rooms later).
    room_number = models.CharField(max_length=20)

    status = models.CharField(
        max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.PENDING
    )
    priority = models.CharField(
        max_length=10, choices=ComplaintPriority.choices, default=ComplaintPriority.MEDIUM
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints_assigned",
        limit_choices_to={"role": "ADMIN"},
    )

    resolution_notes = models.TextField(blank=True)

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
        return f"[{self.category}] {self.title} — {self.status}"


class ComplaintAttachment(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="attachments")
    image = models.ImageField(upload_to="complaint_attachments/%Y/%m/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for Complaint #{self.complaint_id}"


class ComplaintStatusHistory(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="status_history")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="complaint_status_changes",
    )
    old_status = models.CharField(max_length=20, choices=ComplaintStatus.choices, blank=True)
    new_status = models.CharField(max_length=20, choices=ComplaintStatus.choices)
    note = models.CharField(max_length=255, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-changed_at"]
        verbose_name_plural = "Complaint status histories"

    def __str__(self):
        return f"Complaint #{self.complaint_id}: {self.old_status} → {self.new_status}"


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class NotificationType(models.TextChoices):
    NEW_COMPLAINT = "NEW_COMPLAINT", "New Complaint"
    STATUS_CHANGE = "STATUS_CHANGE", "Status Change"


class Notification(models.Model):
    """
    In-app notification. Email/SMS are separate delivery channels triggered
    alongside this (see signals.py) — this row is what powers a resident's
    or admin's in-app notification list.
    """

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
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


# ─────────────────────────────────────────────
# COMMENTS
# ─────────────────────────────────────────────

class Comment(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on Complaint #{self.complaint_id}"


# ─────────────────────────────────────────────
# REVIEWS
# ─────────────────────────────────────────────

class Review(models.Model):
    complaint = models.OneToOneField(Complaint, on_delete=models.CASCADE, related_name="review")
    resident = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review for Complaint #{self.complaint_id}: {self.rating}/5"