import logging

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import (
    Announcement,
    Complaint,
    ComplaintStatusHistory,
    Notification,
    NotificationType,
    Role,
    User,
)

logger = logging.getLogger(__name__)


def send_notification_email(to_email, subject, message):
    """Send through Brevo when configured, otherwise use Django's email backend."""
    if not to_email:
        return False
    try:
        if settings.BREVO_API_KEY:
            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {
                        "name": "Sherpherdsville",
                        "email": settings.BREVO_SENDER_EMAIL,
                    },
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "textContent": message,
                },
                timeout=10,
            )
            response.raise_for_status()
        else:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [to_email],
                fail_silently=False,
            )
        return True
    except Exception:
        logger.exception("Failed to send notification email to %s", to_email)
        return False


@receiver(post_save, sender=Complaint)
def notify_admins_on_new_complaint(sender, instance, created, **kwargs):
    if not created:
        return
    admins = (
        User.objects.filter(role=Role.ADMIN) | User.objects.filter(is_superuser=True)
    ).distinct()
    message = (
        f"New complaint: '{instance.title}' ({instance.category}). "
        f"Room {instance.room_number}"
    )
    for admin in admins:
        if admin.notify_in_app:
            Notification.objects.create(
                recipient=admin,
                notification_type=NotificationType.NEW_COMPLAINT,
                complaint=instance,
                message=message,
            )
        if admin.notify_email_status:
            send_notification_email(
                admin.email,
                f"New Complaint: {instance.title}",
                (
                    f"Hi {admin.first_name or admin.username},\n\n"
                    "A new complaint has been filed.\n\n"
                    f"Category: {instance.category}\n"
                    f"Room: {instance.room_number}\n"
                    f"Title: {instance.title}\n"
                    f"Description: {instance.description}\n"
                ),
            )


@receiver(post_save, sender=ComplaintStatusHistory)
def notify_resident_on_status_change(sender, instance, created, **kwargs):
    if not created or not instance.old_status:
        return
    complaint = instance.complaint
    resident = complaint.resident
    message = f"Your complaint '{complaint.title}' is now {instance.get_new_status_display()}"
    if resident.notify_in_app:
        Notification.objects.create(
            recipient=resident,
            notification_type=NotificationType.STATUS_CHANGE,
            complaint=complaint,
            message=message,
        )
    if resident.notify_email_status:
        notes = f"Notes: {complaint.resolution_notes}\n" if complaint.resolution_notes else ""
        send_notification_email(
            resident.email,
            f"Complaint Update: {complaint.title}",
            (
                f"Hi {resident.first_name or resident.username},\n\n"
                f"Your complaint '{complaint.title}' has been updated.\n\n"
                f"New status: {instance.get_new_status_display()}\n{notes}"
            ),
        )


@receiver(post_save, sender=Announcement)
def notify_residents_on_announcement(sender, instance, created, **kwargs):
    if not created or not instance.is_active:
        return
    residents = User.objects.filter(
        role=Role.RESIDENT, is_active=True, is_active_resident=True
    )
    for resident in residents:
        if resident.notify_in_app:
            Notification.objects.create(
                recipient=resident,
                notification_type=NotificationType.ANNOUNCEMENT,
                message=f"New announcement: {instance.title}",
            )
        if resident.notify_email_announcements:
            send_notification_email(
                resident.email,
                f"Announcement: {instance.title}",
                instance.content,
            )
