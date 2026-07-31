import logging
import requests

from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Complaint, ComplaintStatusHistory, Notification, NotificationType, User

logger = logging.getLogger(__name__)



def send_notification_email(to_email, subject, message):
    """
    Sends via Brevo's HTTP API instead of raw SMTP, since some hosts
    (Railway included) block outbound SMTP ports entirely. HTTPS traffic
    like this works reliably everywhere.
    Wrapped in try/except so an email failure never breaks the actual
    complaint/status-update request itself.
    """
    if not to_email:
        return
    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": settings.BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "sender": {"name": "Sherpherdsville", "email": "joshsackey123@gmail.com"},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": message,
            },
            timeout=10,
        )
        if response.status_code >= 400:
            logger.error(
                "Brevo API error sending to %s: %s %s",
                to_email, response.status_code, response.text
            )
    except Exception:
        logger.exception("Failed to send notification email to %s", to_email)

@receiver(post_save, sender=Complaint)
def notify_admins_on_new_complaint(sender, instance, created, **kwargs):
    """When a resident files a new complaint, notify every Admin (in-app + email)."""
    if not created:
        return

    admins = (User.objects.filter(role="ADMIN") | User.objects.filter(is_superuser=True)).distinct()

    message = f"New complaint: '{instance.title}' ({instance.category}) — Room {instance.room_number}"

    for admin in admins:
        Notification.objects.create(
            recipient=admin,
            notification_type=NotificationType.NEW_COMPLAINT,
            complaint=instance,
            message=message,
        )
        send_notification_email(
            admin.email,
            subject=f"New Complaint: {instance.title}",
            message=(
                f"Hi {admin.first_name or admin.username},\n\n"
                f"A new complaint has been filed.\n\n"
                f"Category: {instance.category}\n"
                f"Room: {instance.room_number}\n"
                f"Title: {instance.title}\n"
                f"Description: {instance.description}\n\n"
                f"— Sherpherdsville Complaints System"
            ),
        )


@receiver(post_save, sender=ComplaintStatusHistory)
def notify_resident_on_status_change(sender, instance, created, **kwargs):
    """When a complaint's status changes, notify the resident (in-app + email)."""
    if not created:
        return

    complaint = instance.complaint
    resident = complaint.resident
    message = f"Your complaint '{complaint.title}' is now {instance.new_status}"

    Notification.objects.create(
        recipient=resident,
        notification_type=NotificationType.STATUS_CHANGE,
        complaint=complaint,
        message=message,
    )
    send_notification_email(
        resident.email,
        subject=f"Complaint Update: {complaint.title}",
        message=(
            f"Hi {resident.first_name or resident.username},\n\n"
            f"Your complaint '{complaint.title}' has been updated.\n\n"
            f"New status: {instance.new_status}\n"
            + (f"Notes: {complaint.resolution_notes}\n\n" if complaint.resolution_notes else "\n")
            + "— Sherpherdsville Complaints System"
        ),
    )