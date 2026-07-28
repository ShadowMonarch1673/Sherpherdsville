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

from .models import User, Complaint, ComplaintStatusHistory, Notification, Comment, Review
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ComplaintSerializer,
    ComplaintStatusUpdateSerializer,
    ComplaintAttachmentSerializer,
    NotificationSerializer,
    CommentSerializer,
    ReviewSerializer,
)
from .permissions import IsResident, IsOwnerOrAdmin, IsAdminRole


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