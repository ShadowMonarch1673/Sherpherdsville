from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import Complaint, ComplaintStatus, Role, User
from api.signals import send_notification_email


class Command(BaseCommand):
    help = "Email administrators a summary of recent and overdue complaints."

    def handle(self, *args, **options):
        complaints = Complaint.objects.exclude(
            status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]
        )
        recent = complaints.filter(created_at__gte=timezone.now() - timedelta(days=1)).count()
        overdue = sum(item.is_overdue for item in complaints)
        admins = (
            User.objects.filter(role=Role.ADMIN) | User.objects.filter(is_superuser=True)
        ).distinct()
        sent = 0
        for admin in admins:
            if not admin.email or not admin.notify_email_status:
                continue
            if send_notification_email(
                admin.email,
                "Sherpherdsville daily complaint digest",
                f"New in the last 24 hours: {recent}\nOpen and overdue: {overdue}\n",
            ):
                sent += 1
        self.stdout.write(self.style.SUCCESS(f"Digest sent to {sent} administrator(s)."))
