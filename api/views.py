import requests
from django.conf import settings
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import random
from datetime import timedelta
from django.db import connections

from .models import User, Complaint, ComplaintStatusHistory, Notification, Comment, Review, OTP, Category
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ComplaintSerializer,
    ComplaintStatusUpdateSerializer,
    ComplaintAttachmentSerializer,
    NotificationSerializer,
    CommentSerializer,
    ReviewSerializer,
    RequestOTPSerializer,
    VerifyOTPSerializer,
    CategorySerializer,
)
from .permissions import IsResident, IsOwnerOrAdmin, IsAdminRole
import logging
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """POST /api/register/ — public, creates a Resident account."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/me/ — view or update your own profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ComplaintListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/complaints/  -> Residents see only their own; Admins see all.
    POST /api/complaints/  -> Only Residents may file a complaint.
    """
    serializer_class = ComplaintSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Complaint.objects.all()
        return Complaint.objects.filter(resident=user)

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsResident()]
        return [permissions.IsAuthenticated()]


class ComplaintDetailView(generics.RetrieveUpdateAPIView):
    """
    GET        /api/complaints/<id>/  -> owner or Admin can view.
    PATCH/PUT  /api/complaints/<id>/  -> Admin only, updates status/priority/
                                          assigned_to/resolution_notes.
    """
    queryset = Complaint.objects.all()

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ComplaintStatusUpdateSerializer
        return ComplaintSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()

        if instance.status != old_status:
            ComplaintStatusHistory.objects.create(
                complaint=instance,
                changed_by=self.request.user,
                old_status=old_status,
                new_status=instance.status,
            )
            if instance.status == "RESOLVED" and not instance.resolved_at:
                instance.resolved_at = timezone.now()
                instance.save(update_fields=["resolved_at"])


class ComplaintAttachmentUploadView(generics.CreateAPIView):
    """
    POST /api/complaints/<complaint_id>/attachments/
    The resident who owns the complaint can attach photos to it.
    """
    serializer_class = ComplaintAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        complaint = get_object_or_404(Complaint, pk=self.kwargs["complaint_id"])
        user = self.request.user
        if not (user.is_admin or complaint.resident_id == user.id):
            raise PermissionDenied("You do not have permission to attach files to this complaint.")
        serializer.save(complaint=complaint)


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns only the logged-in user's own notifications, newest first.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationMarkReadView(generics.UpdateAPIView):
    """
    PATCH /api/notifications/<id>/
    Mark a single notification as read. Only the recipient can update it.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class GoogleLoginRedirectView(APIView):
    """
    GET /api/auth/google/login/
    Sends the user's browser to Google's sign-in page.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        google_auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={settings.GOOGLE_CLIENT_ID}"
            f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
            "&response_type=code"
            "&scope=openid%20email%20profile"
            "&access_type=offline"
        )
        return redirect(google_auth_url)


class GoogleLoginCallbackView(APIView):
    """
    GET /api/auth/google/callback/
    Google redirects here after the user signs in. We exchange the code
    Google gave us for the user's profile, then find-or-create a matching
    Resident account, and return the same JWT tokens as normal login.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.GET.get("code")
        if not code:
            return Response({"detail": "Missing authorization code."}, status=400)

        # Step 1: exchange the code for an access token
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_response.status_code != 200:
            return Response({"detail": "Failed to exchange code with Google."}, status=400)

        google_access_token = token_response.json().get("access_token")

        # Step 2: fetch the user's Google profile
        profile_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if profile_response.status_code != 200:
            return Response({"detail": "Failed to fetch profile from Google."}, status=400)

        profile = profile_response.json()
        google_id = profile["id"]
        email = profile.get("email")
        first_name = profile.get("given_name", "")
        last_name = profile.get("family_name", "")

        # Step 3: find or create the matching User
        user = User.objects.filter(google_id=google_id).first()
        if not user:
            user = User.objects.filter(email=email).first()

        if not user:
            base_username = (email.split("@")[0] if email else f"google_{google_id}")
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1

            user = User.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                google_id=google_id,
                role="RESIDENT",
            )
            user.set_unusable_password()
            user.save()
        elif not user.google_id:
            user.google_id = google_id
            user.save(update_fields=["google_id"])

        # Step 4: issue the same JWT tokens normal login uses
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })


class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/complaints/<complaint_id>/comments/  -> owner or Admin can view the thread.
    POST /api/complaints/<complaint_id>/comments/  -> owner or Admin can post a comment.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_complaint(self):
        complaint = get_object_or_404(Complaint, pk=self.kwargs["complaint_id"])
        user = self.request.user
        if not (user.is_admin or complaint.resident_id == user.id):
            raise PermissionDenied("You do not have permission to view or comment on this complaint.")
        return complaint

    def get_queryset(self):
        complaint = self.get_complaint()
        return Comment.objects.filter(complaint=complaint)

    def perform_create(self, serializer):
        complaint = self.get_complaint()
        serializer.save(complaint=complaint, author=self.request.user)


class ReviewCreateView(generics.CreateAPIView):
    """
    POST /api/complaints/<complaint_id>/review/
    Only the resident who owns the complaint can leave a review, and only
    once the complaint has been marked RESOLVED. One review per complaint.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsResident]

    def perform_create(self, serializer):
        complaint = get_object_or_404(Complaint, pk=self.kwargs["complaint_id"])
        user = self.request.user

        if complaint.resident_id != user.id:
            raise PermissionDenied("You can only review your own complaints.")
        if complaint.status != "RESOLVED":
            raise PermissionDenied("You can only review a complaint after it has been resolved.")
        if hasattr(complaint, "review"):
            raise PermissionDenied("This complaint has already been reviewed.")

        serializer.save(complaint=complaint, resident=user)



def lookup_external_resident(email):
    """
    Queries the client's external database (read-only) to check if this
    email belongs to a real resident, and if so, returns their details.
    Table/column names come from settings so they're easy to update once
    we have the client's real schema.
    """
    table = settings.EXTERNAL_RESIDENTS_TABLE
    email_col = settings.EXTERNAL_EMAIL_COLUMN
    first_col = settings.EXTERNAL_FIRST_NAME_COLUMN
    last_col = settings.EXTERNAL_LAST_NAME_COLUMN
    room_col = settings.EXTERNAL_ROOM_COLUMN

    query = f"""
        SELECT {email_col}, {first_col}, {last_col}, {room_col}
        FROM {table}
        WHERE {email_col} = %s
        LIMIT 1
    """
    with connections["external"].cursor() as cursor:
        cursor.execute(query, [email])
        row = cursor.fetchone()

    if not row:
        return None
    return {
        "email": row[0],
        "first_name": row[1] or "",
        "last_name": row[2] or "",
        "room_number": row[3] or "",
    }


class RequestOTPView(APIView):
    """
    POST /api/auth/request-otp/
    Checks if the email exists in the client's resident database, and if
    so, generates and emails a 6-digit OTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        resident = lookup_external_resident(email)
        if not resident:
            return Response(
                {"detail": "This email was not found in the resident records."},
                status=404,
            )

        code = f"{random.randint(0, 999999):06d}"
        OTP.objects.create(
            email=email,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        send_notification_email_wrapper = None
        try:
            from .signals import send_notification_email
            send_notification_email(
                email,
                subject="Your Sherpherdsville Login Code",
                message=f"Your one-time login code is: {code}\n\nThis code expires in 10 minutes.",
            )
        except Exception:
            logger.exception("Failed to send OTP email to %s", email)

        return Response({"detail": "OTP sent to your email."}, status=200)


class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Validates the OTP, then finds-or-creates the local User (pulling
    profile info from the external DB on first login), and issues JWT
    tokens with a 3-day lifetime.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        code = serializer.validated_data["code"]

        otp = (
            OTP.objects.filter(email=email, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )
        if not otp:
            return Response({"detail": "Invalid code."}, status=400)
        if otp.expires_at < timezone.now():
            return Response({"detail": "This code has expired."}, status=400)

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        user = User.objects.filter(email=email).first()
        if not user:
            resident = lookup_external_resident(email)
            base_username = email.split("@")[0]
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1

            user = User.objects.create(
                username=username,
                email=email,
                first_name=resident["first_name"] if resident else "",
                last_name=resident["last_name"] if resident else "",
                room_number=resident["room_number"] if resident else "",
                role="RESIDENT",
            )
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]