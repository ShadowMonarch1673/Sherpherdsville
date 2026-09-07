from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Announcement,
    AuditLog,
    Category,
    Complaint,
    ComplaintStatus,
    FAQArticle,
    Notification,
    OTP,
    ResidentRegistry,
    Role,
    User,
)


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    BREVO_API_KEY="",
    OTP_DEBUG_RETURN_CODE=True,
)
class PortalAPITests(APITestCase):
    def setUp(self):
        self.electrical = Category.objects.get(name="Electrical")
        self.plumbing = Category.objects.get(name="Plumbing")
        self.other = Category.objects.get(name="Other")
        self.admin = User.objects.create_user(
            username="admin-test",
            email="admin-test@example.com",
            password="StrongPass123!",
            role=Role.ADMIN,
            is_staff=True,
        )
        self.resident = User.objects.create_user(
            username="resident-test",
            email="resident-test@example.com",
            password="StrongPass123!",
            first_name="Test",
            last_name="Resident",
            telephone="+254700000001",
            room_number="A1",
            role=Role.RESIDENT,
        )
        self.other_resident = User.objects.create_user(
            username="resident-other",
            email="resident-other@example.com",
            password="StrongPass123!",
            telephone="+254700000002",
            room_number="A2",
            role=Role.RESIDENT,
        )

    def make_complaint(self, resident=None, category=None, status_value=ComplaintStatus.PENDING):
        return Complaint.objects.create(
            resident=resident or self.resident,
            category=category or self.electrical,
            title="Broken light",
            description="The ceiling light is not working.",
            room_number=(resident or self.resident).room_number,
            status=status_value,
            resolved_at=timezone.now() if status_value == ComplaintStatus.RESOLVED else None,
        )

    def test_authentication_is_required_for_private_routes(self):
        response = self.client.get("/api/categories/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_otp_login_accepts_existing_resident_user_email(self):
        requested = self.client.post(
            "/api/auth/otp/request/", {"email": self.resident.email}, format="json"
        )
        self.assertEqual(requested.status_code, status.HTTP_200_OK)
        self.assertRegex(requested.data["debug_otp"], r"^\d{6}$")

        verified = self.client.post(
            "/api/auth/otp/verify/",
            {"email": self.resident.email, "code": requested.data["debug_otp"]},
            format="json",
        )
        self.assertEqual(verified.status_code, status.HTTP_200_OK)
        self.assertIn("access", verified.data)

    def test_otp_rejects_phone_only_requests(self):
        response = self.client.post(
            "/api/auth/otp/request/", {"telephone": self.resident.telephone}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_otp_rejects_non_resident_user_email(self):
        response = self.client.post(
            "/api/auth/otp/request/", {"email": self.admin.email}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_otp_is_single_use_and_expires(self):
        ResidentRegistry.objects.create(
            email="otp@example.com",
            first_name="OTP",
            last_name="User",
            room_number="C1",
        )
        otp = OTP.objects.create(
            email="otp@example.com",
            code="123456",
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        response = self.client.post(
            "/api/auth/otp/verify/",
            {"email": "otp@example.com", "code": "123456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        otp.refresh_from_db()
        self.assertFalse(otp.is_used)

    def test_resident_can_create_and_only_see_own_complaints(self):
        self.make_complaint(resident=self.other_resident)
        self.client.force_authenticate(self.resident)
        created = self.client.post(
            "/api/complaints/",
            {
                "category": self.electrical.pk,
                "title": "Socket sparks",
                "description": "The socket produces sparks.",
                "priority": "LOW",
                "room_number": "HACKED",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["category_name"], "Electrical")
        self.assertEqual(created.data["priority"], "URGENT")
        self.assertEqual(created.data["room_number"], "A1")
        self.assertIn("comments_count", created.data)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.admin, complaint_id=created.data["id"]
            ).count(),
            1,
        )

        listed = self.client.get("/api/complaints/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["resident_id"], self.resident.pk)

    def test_resident_cannot_change_assigned_room(self):
        self.client.force_authenticate(self.resident)
        response = self.client.patch("/api/me/", {"room_number": "HACKED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.resident.refresh_from_db()
        self.assertEqual(self.resident.room_number, "A1")

    def test_complaint_requires_an_admin_assigned_room(self):
        self.resident.room_number = ""
        self.resident.save(update_fields=["room_number"])
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            "/api/complaints/",
            {
                "category": self.other.pk,
                "title": "Minor cosmetic issue",
                "description": "Small paint scratch near the desk.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("room_number", response.data)

    def test_specialist_is_limited_to_their_category(self):
        specialist = User.objects.create_user(
            username="electrician",
            email="electrician@example.com",
            password="StrongPass123!",
            role=Role.ELECTRICIAN,
            category_specialization=self.electrical,
        )
        electrical = self.make_complaint(category=self.electrical)
        plumbing = self.make_complaint(category=self.plumbing)
        self.client.force_authenticate(specialist)

        listed = self.client.get("/api/complaints/?queue=open")
        self.assertEqual([item["id"] for item in listed.data], [electrical.pk])
        forbidden = self.client.get(f"/api/complaints/{plumbing.pk}/")
        self.assertEqual(forbidden.status_code, status.HTTP_404_NOT_FOUND)
        updated = self.client.patch(
            f"/api/complaints/{electrical.pk}/",
            {"status": ComplaintStatus.IN_PROGRESS},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)

    def test_admin_status_update_sets_and_clears_resolution_time(self):
        complaint = self.make_complaint()
        self.client.force_authenticate(self.admin)
        resolved = self.client.patch(
            f"/api/complaints/{complaint.pk}/",
            {"status": ComplaintStatus.RESOLVED, "resolution_notes": "Replaced bulb."},
            format="json",
        )
        self.assertEqual(resolved.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertIsNotNone(complaint.resolved_at)
        self.assertTrue(AuditLog.objects.filter(object_id=complaint.pk).exists())

        reopened = self.client.patch(
            f"/api/complaints/{complaint.pk}/",
            {"status": ComplaintStatus.IN_PROGRESS},
            format="json",
        )
        self.assertEqual(reopened.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertIsNone(complaint.resolved_at)

    def test_resident_can_reopen_closed_complaint_with_note(self):
        complaint = self.make_complaint(status_value=ComplaintStatus.RESOLVED)
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            f"/api/complaints/{complaint.pk}/reopen/",
            {"note": "The light failed again."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.PENDING)
        self.assertEqual(complaint.reopen_count, 1)
        self.assertIsNone(complaint.resolved_at)

    def test_admin_only_bulk_update(self):
        first = self.make_complaint()
        second = self.make_complaint(resident=self.other_resident)
        self.client.force_authenticate(self.resident)
        denied = self.client.post(
            "/api/complaints/bulk/",
            {"ids": [first.pk, second.pk], "status": ComplaintStatus.RESOLVED},
            format="json",
        )
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin)
        updated = self.client.post(
            "/api/complaints/bulk/",
            {"ids": [first.pk, second.pk], "status": ComplaintStatus.RESOLVED},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["updated"], 2)

    def test_announcements_calendar_faq_analytics_triage_and_chatbot(self):
        FAQArticle.objects.create(
            question="How is water reported?",
            answer="File a plumbing complaint.",
            category="Water",
        )
        self.make_complaint()
        self.client.force_authenticate(self.admin)
        announcement = self.client.post(
            "/api/announcements/",
            {"title": "Inspection", "content": "Rooms will be inspected.", "is_pinned": True},
            format="json",
        )
        self.assertEqual(announcement.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Announcement.objects.filter(title="Inspection").exists())
        scheduled = self.client.post(
            "/api/scheduled-works/",
            {
                "title": "Water work",
                "start_at": (timezone.now() + timedelta(days=1)).isoformat(),
                "end_at": (timezone.now() + timedelta(days=1, hours=2)).isoformat(),
                "affected_blocks": "A",
            },
            format="json",
        )
        self.assertEqual(scheduled.status_code, status.HTTP_201_CREATED)
        analytics = self.client.get("/api/analytics/")
        self.assertEqual(analytics.status_code, status.HTTP_200_OK)
        self.assertIn("by_category", analytics.data)
        audit_log = self.client.get("/api/audit-logs/")
        self.assertGreaterEqual(len(audit_log.data), 2)

        self.client.force_authenticate(self.resident)
        announcements = self.client.get("/api/announcements/")
        self.assertEqual(announcements.status_code, status.HTTP_200_OK)
        calendar = self.client.get("/api/scheduled-works/")
        self.assertEqual(calendar.status_code, status.HTTP_403_FORBIDDEN)
        faq = self.client.get("/api/faq/?q=water")
        self.assertEqual(len(faq.data), 1)
        triage = self.client.post(
            "/api/triage/",
            {"title": "Water leak", "description": "Pipe is flooding the room"},
            format="json",
        )
        self.assertEqual(triage.data["suggested_category_name"], "Plumbing")
        self.assertEqual(triage.data["suggested_priority"], "URGENT")
        chatbot = self.client.post(
            "/api/chatbot/", {"message": "What are the categories?"}, format="json"
        )
        self.assertEqual(chatbot.status_code, status.HTTP_200_OK)
        self.assertIn("Electrical", chatbot.data["reply"])

    def test_password_can_be_set_for_an_otp_only_account(self):
        self.resident.set_unusable_password()
        self.resident.save(update_fields=["password"])
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            "/api/me/password/",
            {"current_password": "", "new_password": "AnotherStrong123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.resident.refresh_from_db()
        self.assertTrue(self.resident.check_password("AnotherStrong123!"))
