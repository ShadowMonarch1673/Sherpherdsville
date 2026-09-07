from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    Announcement,
    Category,
    Complaint,
    FAQArticle,
    ResidentRegistry,
    Role,
    ScheduledWork,
    User,
)
from api.triage import analyze_complaint


class Command(BaseCommand):
    help = "Create idempotent demonstration data and login accounts."

    def handle(self, *args, **options):
        categories = {}
        for name in [
            "Electrical",
            "Carpentry",
            "Plumbing",
            "Cleaning",
            "Security",
            "Internet",
            "Other",
        ]:
            categories[name], _ = Category.objects.get_or_create(name=name)

        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@sherpherdsville.local",
                "first_name": "System",
                "last_name": "Administrator",
                "role": Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("ChangeMe123!")
            admin.save(update_fields=["password"])

        residents = [
            ("Jane", "Wanjiku", "+254712000001", "jane@student.sherpherdsville.com", "A101"),
            ("John", "Otieno", "+254712000002", "john@student.sherpherdsville.com", "A102"),
            ("Mary", "Kamau", "+254712000003", "mary@student.sherpherdsville.com", "B201"),
            ("Peter", "Mwangi", "+254712000004", "peter@student.sherpherdsville.com", "B202"),
            ("Grace", "Achieng", "+254712000005", "grace@student.sherpherdsville.com", "C301"),
        ]
        for first_name, last_name, telephone, email, room in residents:
            ResidentRegistry.objects.update_or_create(
                email=email,
                defaults={
                    "telephone": telephone,
                    "first_name": first_name,
                    "last_name": last_name,
                    "room_number": room,
                    "is_active": True,
                },
            )

        jane, jane_created = User.objects.get_or_create(
            email="jane@student.sherpherdsville.com",
            defaults={
                "username": "jane",
                "first_name": "Jane",
                "last_name": "Wanjiku",
                "telephone": "+254712000001",
                "room_number": "A101",
                "role": Role.RESIDENT,
            },
        )
        if jane_created:
            jane.set_unusable_password()
            jane.save(update_fields=["password"])

        Complaint.objects.get_or_create(
            resident=jane,
            title="Intermittent power in room",
            defaults={
                "category": categories["Electrical"],
                "description": "The lights and wall sockets switch off intermittently.",
                "room_number": jane.room_number,
                "priority": analyze_complaint(
                    "Intermittent power in room",
                    "The lights and wall sockets switch off intermittently.",
                )["priority"],
            },
        )

        FAQArticle.objects.get_or_create(
            question="How do I file a complaint?",
            defaults={
                "answer": "Open New Complaint, describe the problem, choose a category, and add photos if useful.",
                "category": "Complaints",
                "order": 1,
            },
        )
        FAQArticle.objects.get_or_create(
            question="What should I do in an emergency?",
            defaults={
                "answer": "Contact hostel security immediately, move to a safe place, and then file an urgent report.",
                "category": "Safety",
                "order": 2,
            },
        )
        Announcement.objects.get_or_create(
            title="Welcome to the resident portal",
            defaults={
                "content": "Use this portal to report and track hostel maintenance issues.",
                "created_by": admin,
                "is_pinned": True,
            },
        )
        ScheduledWork.objects.get_or_create(
            title="Monthly water-system inspection",
            defaults={
                "description": "Routine inspection; short interruptions may occur.",
                "category": categories["Plumbing"],
                "affected_blocks": "All blocks",
                "start_at": timezone.now() + timedelta(days=7),
                "end_at": timezone.now() + timedelta(days=7, hours=2),
                "created_by": admin,
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        self.stdout.write("Admin: admin / ChangeMe123!")
        self.stdout.write("Residents: request an OTP using a seeded email.")
