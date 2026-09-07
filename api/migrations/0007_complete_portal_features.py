import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def seed_additional_categories(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    categories = {
        "Electrical": "Power, lighting, sockets, and electrical safety.",
        "Carpentry": "Doors, windows, furniture, and woodwork.",
        "Plumbing": "Water supply, leaks, drains, and sanitary fittings.",
        "Cleaning": "Cleaning, waste, and sanitation.",
        "Security": "Access, locks, safety, and security incidents.",
        "Internet": "Wi-Fi and network connectivity.",
        "Other": "Issues that do not fit another category.",
    }
    for name, description in categories.items():
        category, _ = Category.objects.get_or_create(name=name)
        if not category.description:
            category.description = description
            category.save(update_fields=["description"])


class Migration(migrations.Migration):
    dependencies = [("api", "0006_otp")]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("RESIDENT", "Resident"),
                    ("ADMIN", "Admin"),
                    ("ELECTRICIAN", "Electrician"),
                    ("PLUMBER", "Plumber"),
                    ("CARPENTER", "Carpenter"),
                    ("CLEANER", "Cleaner"),
                    ("SECURITY", "Security"),
                ],
                default="RESIDENT",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="notify_in_app",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="notify_email_status",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="notify_email_announcements",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="complaint",
            name="reopen_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="complaint",
            name="resolution_image",
            field=models.ImageField(
                blank=True, null=True, upload_to="resolution_images/%Y/%m/"
            ),
        ),
        migrations.AlterField(
            model_name="complaint",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={
                    "role__in": [
                        "ADMIN",
                        "ELECTRICIAN",
                        "PLUMBER",
                        "CARPENTER",
                        "CLEANER",
                        "SECURITY",
                    ]
                },
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="complaints_assigned",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("NEW_COMPLAINT", "New Complaint"),
                    ("STATUS_CHANGE", "Status Change"),
                    ("ANNOUNCEMENT", "Announcement"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="otp",
            index=models.Index(
                fields=["email", "code", "is_used"], name="api_otp_lookup_idx"
            ),
        ),
        migrations.CreateModel(
            name="ResidentRegistry",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("email", models.EmailField(max_length=254, unique=True)),
                (
                    "telephone",
                    models.CharField(
                        max_length=20,
                        unique=True,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Enter a valid telephone number.",
                                regex="^\\+?[0-9\\s\\-()]{7,20}$",
                            )
                        ],
                    ),
                ),
                ("first_name", models.CharField(max_length=150)),
                ("last_name", models.CharField(max_length=150)),
                ("room_number", models.CharField(max_length=20)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["last_name", "first_name"]},
        ),
        migrations.CreateModel(
            name="FAQArticle",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("question", models.CharField(max_length=255)),
                ("answer", models.TextField()),
                ("category", models.CharField(blank=True, max_length=100)),
                ("is_published", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["order", "question"]},
        ),
        migrations.CreateModel(
            name="Announcement",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=150)),
                ("content", models.TextField()),
                ("is_pinned", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="announcements_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-is_pinned", "-created_at"]},
        ),
        migrations.CreateModel(
            name="ScheduledWork",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True)),
                ("affected_blocks", models.CharField(blank=True, max_length=255)),
                ("start_at", models.DateTimeField()),
                ("end_at", models.DateTimeField()),
                ("is_cancelled", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="scheduled_works",
                        to="api.category",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="scheduled_works_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["start_at"]},
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("action", models.CharField(max_length=50)),
                ("object_type", models.CharField(max_length=100)),
                ("object_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("detail", models.TextField(blank=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.RunPython(seed_additional_categories, migrations.RunPython.noop),
    ]
