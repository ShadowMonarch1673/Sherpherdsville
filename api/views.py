import logging
import secrets
from datetime import date, timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import DatabaseError, connections, transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Announcement,
    AuditLog,
    Category,
    Comment,
    Complaint,
    ComplaintStatus,
    ComplaintStatusHistory,
    FAQArticle,
    OTP,
    ResidentRegistry,
    Review,
    Role,
    ScheduledWork,
    User,
)
from .permissions import IsAdminRole, IsOwnerOrAdmin, IsResident, IsStaffOperator
from .serializers import (
    AnnouncementSerializer,
    AuditLogSerializer,
    CategorySerializer,
    CommentSerializer,
    ComplaintAttachmentSerializer,
    ComplaintSerializer,
    ComplaintStatusUpdateSerializer,
    FAQArticleSerializer,
    NotificationSerializer,
    PasswordChangeSerializer,
    RequestOTPSerializer,
    ReviewSerializer,
    ScheduledWorkSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from .triage import analyze_complaint

logger = logging.getLogger(__name__)


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() if forwarded else None) or request.META.get(
        "REMOTE_ADDR"
    )


def audit(request, action, obj, detail=""):
    AuditLog.objects.create(
        actor=request.user if request.user.is_authenticated else None,
        action=action,
        object_type=obj.__class__.__name__,
        object_id=getattr(obj, "pk", None),
        detail=detail,
        ip_address=client_ip(request),
    )


def visible_complaints(user):
    queryset = Complaint.objects.select_related(
        "resident", "category", "assigned_to"
    ).prefetch_related("attachments", "status_history__changed_by", "comments")
    if user.is_admin:
        return queryset
    if user.is_specialist:
        if not user.category_specialization_id:
            return queryset.none()
        return queryset.filter(category_id=user.category_specialization_id)
    return queryset.filter(resident=user)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        current_password = serializer.validated_data.get("current_password", "")
        if user.has_usable_password() and not user.check_password(current_password):
            return Response(
                {"current_password": ["The current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(serializer.validated_data["new_password"], user=user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        audit(request, "PASSWORD_CHANGED", user)
        return Response({"detail": "Password updated."})


class ComplaintListCreateView(generics.ListCreateAPIView):
    serializer_class = ComplaintSerializer

    def get_queryset(self):
        queryset = visible_complaints(self.request.user)
        if self.request.query_params.get("queue") == "open":
            queryset = queryset.exclude(
                status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]
            )
        status_value = self.request.query_params.get("status")
        if status_value in ComplaintStatus.values:
            queryset = queryset.filter(status=status_value)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsResident()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        complaint = serializer.save()
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            changed_by=self.request.user,
            old_status="",
            new_status=complaint.status,
            note="Complaint filed",
        )
        audit(self.request, "CREATED", complaint, complaint.title)


class ComplaintDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ComplaintSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return visible_complaints(self.request.user)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ComplaintStatusUpdateSerializer
        return ComplaintSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [permissions.IsAuthenticated(), IsStaffOperator()]
        return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]

    @transaction.atomic
    def perform_update(self, serializer):
        complaint = self.get_object()
        old_status = complaint.status
        updated = serializer.save()

        if updated.status == ComplaintStatus.RESOLVED:
            if not updated.resolved_at:
                updated.resolved_at = timezone.now()
                updated.save(update_fields=["resolved_at"])
        elif updated.resolved_at:
            updated.resolved_at = None
            updated.save(update_fields=["resolved_at"])

        if updated.status != old_status:
            ComplaintStatusHistory.objects.create(
                complaint=updated,
                changed_by=self.request.user,
                old_status=old_status,
                new_status=updated.status,
                note=updated.resolution_notes[:255],
            )
        audit(
            self.request,
            "UPDATED",
            updated,
            f"status {old_status} → {updated.status}",
        )


class ComplaintAttachmentUploadView(generics.CreateAPIView):
    serializer_class = ComplaintAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        complaint = get_object_or_404(
            visible_complaints(self.request.user), pk=self.kwargs["complaint_id"]
        )
        if complaint.attachments.count() >= 5:
            raise serializers.ValidationError("A complaint can have at most five images.")
        attachment = serializer.save(complaint=complaint)
        audit(self.request, "ATTACHMENT_ADDED", complaint, f"attachment #{attachment.pk}")


class ComplaintReopenView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsResident]

    @transaction.atomic
    def post(self, request, complaint_id):
        complaint = get_object_or_404(
            Complaint.objects.select_for_update(), pk=complaint_id, resident=request.user
        )
        if complaint.status not in (ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED):
            return Response(
                {"detail": "Only resolved or rejected complaints can be re-opened."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if complaint.reopen_count >= 3:
            return Response(
                {"detail": "This complaint has reached the re-open limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note = str(request.data.get("note", "")).strip()
        if not note:
            return Response(
                {"detail": "Explain what is still wrong before re-opening."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_status = complaint.status
        complaint.status = ComplaintStatus.PENDING
        complaint.resolved_at = None
        complaint.reopen_count += 1
        complaint.save(update_fields=["status", "resolved_at", "reopen_count", "updated_at"])
        ComplaintStatusHistory.objects.create(
            complaint=complaint,
            changed_by=request.user,
            old_status=old_status,
            new_status=ComplaintStatus.PENDING,
            note=note[:255],
        )
        Comment.objects.create(complaint=complaint, author=request.user, text=note)
        audit(request, "REOPENED", complaint, note)
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)


class ComplaintBulkUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    @transaction.atomic
    def post(self, request):
        ids = request.data.get("ids", [])
        new_status = request.data.get("status")
        if (
            not isinstance(ids, list)
            or not ids
            or not all(isinstance(item, int) and not isinstance(item, bool) for item in ids)
        ):
            return Response(
                {"ids": ["Select at least one complaint."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status not in ComplaintStatus.values:
            return Response(
                {"status": ["Choose a valid status."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        complaints = list(Complaint.objects.select_for_update().filter(pk__in=ids))
        if len(complaints) != len(set(ids)):
            return Response(
                {"ids": ["One or more complaints do not exist."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        changed = 0
        for complaint in complaints:
            old_status = complaint.status
            if old_status == new_status:
                continue
            complaint.status = new_status
            complaint.resolved_at = (
                timezone.now() if new_status == ComplaintStatus.RESOLVED else None
            )
            complaint.save(update_fields=["status", "resolved_at", "updated_at"])
            ComplaintStatusHistory.objects.create(
                complaint=complaint,
                changed_by=request.user,
                old_status=old_status,
                new_status=new_status,
                note="Bulk status update",
            )
            audit(request, "BULK_UPDATED", complaint, f"{old_status} → {new_status}")
            changed += 1
        return Response({"updated": changed})


class ComplaintOverdueView(generics.ListAPIView):
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOperator]

    def get_queryset(self):
        return [item for item in visible_complaints(self.request.user) if item.is_overdue]


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.select_related("complaint")


class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.all()


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_complaint(self):
        return get_object_or_404(
            visible_complaints(self.request.user), pk=self.kwargs["complaint_id"]
        )

    def get_queryset(self):
        return Comment.objects.filter(complaint=self.get_complaint()).select_related("author")

    def perform_create(self, serializer):
        complaint = self.get_complaint()
        comment = serializer.save(complaint=complaint, author=self.request.user)
        audit(self.request, "COMMENTED", complaint, f"comment #{comment.pk}")


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsResident]

    def perform_create(self, serializer):
        complaint = get_object_or_404(
            Complaint, pk=self.kwargs["complaint_id"], resident=self.request.user
        )
        if complaint.status != ComplaintStatus.RESOLVED:
            raise PermissionDenied("You can only review a resolved complaint.")
        if Review.objects.filter(complaint=complaint).exists():
            raise serializers.ValidationError("This complaint has already been reviewed.")
        review = serializer.save(complaint=complaint, resident=self.request.user)
        audit(self.request, "REVIEWED", complaint, f"rating {review.rating}/5")


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class AnnouncementListCreateView(generics.ListCreateAPIView):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        queryset = Announcement.objects.select_related("created_by")
        if not self.request.user.is_admin:
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)
        audit(self.request, "PUBLISHED", announcement, announcement.title)


class ScheduledWorkListCreateView(generics.ListCreateAPIView):
    queryset = ScheduledWork.objects.select_related("category", "created_by")
    serializer_class = ScheduledWorkSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.IsAuthenticated(), IsStaffOperator()]

    def perform_create(self, serializer):
        scheduled_work = serializer.save(created_by=self.request.user)
        audit(self.request, "SCHEDULED", scheduled_work, scheduled_work.title)


class FAQListView(generics.ListAPIView):
    serializer_class = FAQArticleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = FAQArticle.objects.filter(is_published=True)
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(question__icontains=query)
                | Q(answer__icontains=query)
                | Q(category__icontains=query)
            )
        return queryset


class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.select_related("actor")
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]


def analytics_queryset(request):
    queryset = visible_complaints(request.user)
    start = request.query_params.get("from")
    end = request.query_params.get("to")
    try:
        if start:
            queryset = queryset.filter(created_at__date__gte=date.fromisoformat(start))
        if end:
            queryset = queryset.filter(created_at__date__lte=date.fromisoformat(end))
    except ValueError as exc:
        raise serializers.ValidationError(
            {"detail": "Dates must use the YYYY-MM-DD format."}
        ) from exc
    return queryset


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = analytics_queryset(request)
        totals = queryset.aggregate(
            total=Count("id"),
            pending=Count("id", filter=Q(status=ComplaintStatus.PENDING)),
            in_progress=Count("id", filter=Q(status=ComplaintStatus.IN_PROGRESS)),
            resolved=Count("id", filter=Q(status=ComplaintStatus.RESOLVED)),
            rejected=Count("id", filter=Q(status=ComplaintStatus.REJECTED)),
            recent_30_days=Count(
                "id", filter=Q(created_at__gte=timezone.now() - timedelta(days=30))
            ),
        )
        durations = [
            (item.resolved_at - item.created_at).total_seconds() / 86400
            for item in queryset.filter(resolved_at__isnull=False)
        ]
        totals["avg_resolution_days"] = (
            round(sum(durations) / len(durations), 2) if durations else None
        )
        data = {
            "role": "admin" if request.user.is_staff_operator else "resident",
            "totals": totals,
        }
        if request.user.is_admin:
            data["by_category"] = list(
                queryset.values("category__name")
                .annotate(count=Count("id"))
                .order_by("category__name")
            )
            data["by_priority"] = list(
                queryset.values("priority").annotate(count=Count("id")).order_by("priority")
            )
            monthly = (
                queryset.annotate(month_value=TruncMonth("created_at"))
                .values("month_value")
                .annotate(count=Count("id"))
                .order_by("month_value")
            )
            data["monthly_trend"] = [
                {"month": row["month_value"].date().isoformat(), "count": row["count"]}
                for row in monthly
            ]
        return Response(data)


class TriageView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsResident]

    def post(self, request):
        title = str(request.data.get("title", "")).strip()
        description = str(request.data.get("description", "")).strip()
        if not title:
            return Response(
                {"title": ["Enter a title before requesting triage."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = analyze_complaint(title, description)
        category = Category.objects.filter(
            name__iexact=result["category_name"], is_active=True
        ).first()
        return Response(
            {
                "suggested_category_id": category.pk if category else None,
                "suggested_category_name": category.name if category else None,
                "suggested_priority": result["priority"],
                "reason": "Suggestion based on issue keywords and safety urgency.",
                "confidence": result["confidence"],
            }
        )


class ChatbotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = str(request.data.get("message", "")).strip()
        if not message:
            return Response(
                {"message": ["Ask a question."]}, status=status.HTTP_400_BAD_REQUEST
            )
        lowered = message.lower()
        article = FAQArticle.objects.filter(is_published=True).filter(
            Q(question__icontains=message)
            | Q(answer__icontains=message)
            | Q(category__icontains=message)
        ).first()
        if article:
            reply = f"{article.answer}\n\nFrom the Resident Handbook: {article.question}"
        elif "complaint" in lowered and any(
            term in lowered for term in ("my", "status", "check")
        ):
            complaints = visible_complaints(request.user)
            open_count = complaints.exclude(
                status__in=[ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]
            ).count()
            reply = f"You currently have {open_count} open complaint(s). Open Complaints to see details."
        elif "categor" in lowered:
            names = ", ".join(Category.objects.filter(is_active=True).values_list("name", flat=True))
            reply = f"Available complaint categories are: {names}."
        elif "file" in lowered or "report" in lowered:
            reply = "Choose New Complaint, describe the issue, select a category, and optionally attach up to five photos."
        else:
            reply = "I can help with filing complaints, checking their status, categories, and Resident Handbook questions."
        return Response(
            {
                "reply": reply,
                "suggestions": [
                    "How do I file a complaint?",
                    "Check my complaints",
                    "What are the categories?",
                ],
            }
        )


def lookup_resident_by_email(email):
    email = email.strip()
    existing_user = User.objects.filter(email__iexact=email).first()
    if existing_user:
        if (
            existing_user.role != Role.RESIDENT
            or not existing_user.is_active
            or not existing_user.is_active_resident
        ):
            return None
        return {
            "email": existing_user.email,
            "telephone": existing_user.telephone or "",
            "first_name": existing_user.first_name,
            "last_name": existing_user.last_name,
            "room_number": existing_user.room_number or "",
        }

    local = ResidentRegistry.objects.filter(email__iexact=email, is_active=True).first()
    if local:
        return {
            "email": local.email,
            "telephone": local.telephone or "",
            "first_name": local.first_name,
            "last_name": local.last_name,
            "room_number": local.room_number,
        }

    if "external" not in settings.DATABASES:
        return None

    connection = connections["external"]
    quote = connection.ops.quote_name
    table = quote(settings.EXTERNAL_RESIDENTS_TABLE)
    email_col = quote(settings.EXTERNAL_EMAIL_COLUMN)
    first_col = quote(settings.EXTERNAL_FIRST_NAME_COLUMN)
    last_col = quote(settings.EXTERNAL_LAST_NAME_COLUMN)
    room_col = quote(settings.EXTERNAL_ROOM_COLUMN)
    query = (
        f"SELECT {email_col}, {first_col}, {last_col}, {room_col} "
        f"FROM {table} WHERE LOWER({email_col}) = LOWER(%s) LIMIT 1"
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, [email])
            row = cursor.fetchone()
    except DatabaseError:
        logger.exception("Resident registry lookup failed")
        return None
    if not row:
        return None
    return {
        "email": row[0],
        "telephone": "",
        "first_name": row[1] or "",
        "last_name": row[2] or "",
        "room_number": row[3] or "",
    }


class RequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resident = lookup_resident_by_email(serializer.validated_data["email"])
        if not resident:
            return Response(
                {"detail": "This email was not found in the active resident accounts."},
                status=status.HTTP_404_NOT_FOUND,
            )
        recent = OTP.objects.filter(
            email__iexact=resident["email"],
            is_used=False,
            created_at__gte=timezone.now() - timedelta(seconds=60),
        ).exists()
        if recent:
            return Response(
                {"detail": "Please wait one minute before requesting another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        code = f"{secrets.randbelow(1_000_000):06d}"
        OTP.objects.create(
            email=resident["email"],
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        from .signals import send_notification_email

        send_notification_email(
            resident["email"],
            "Your Sherpherdsville login code",
            f"Your one-time login code is {code}. It expires in 10 minutes.",
        )
        response_data = {
            "detail": "OTP sent to the resident's registered email.",
            "resident_name": resident["first_name"],
        }
        if settings.OTP_DEBUG_RETURN_CODE:
            response_data["debug_otp"] = code
        return Response(response_data)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resident = lookup_resident_by_email(serializer.validated_data["email"])
        if not resident:
            return Response({"detail": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST)
        otp = (
            OTP.objects.select_for_update()
            .filter(
                email__iexact=resident["email"],
                code=serializer.validated_data["code"],
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )
        if not otp or otp.expires_at <= timezone.now():
            return Response(
                {"detail": "Invalid or expired code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        user = User.objects.filter(email__iexact=resident["email"]).first()
        if not user:
            base = resident["email"].split("@")[0]
            username = base
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{suffix}"
                suffix += 1
            user = User.objects.create(
                username=username,
                email=resident["email"],
                telephone=resident["telephone"],
                first_name=resident["first_name"],
                last_name=resident["last_name"],
                room_number=resident["room_number"],
                role=Role.RESIDENT,
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
        if not user.is_active or not user.is_active_resident:
            return Response(
                {"detail": "This resident account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        return Response({"refresh": str(refresh), "access": str(refresh.access_token)})


class GoogleLoginRedirectView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_REDIRECT_URI:
            return Response(
                {"detail": "Google login is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        oauth_state = secrets.token_urlsafe(32)
        request.session["google_oauth_state"] = oauth_state
        params = urlencode(
            {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email profile",
                "state": oauth_state,
            }
        )
        return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


class GoogleLoginCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state_value = request.query_params.get("state")
        expected_state = request.session.pop("google_oauth_state", None)
        if not code or not expected_state or not secrets.compare_digest(state_value or "", expected_state):
            return Response(
                {"detail": "Invalid Google login response."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            token_response.raise_for_status()
            profile_response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_response.json()['access_token']}"},
                timeout=10,
            )
            profile_response.raise_for_status()
            profile = profile_response.json()
        except (requests.RequestException, KeyError, ValueError):
            logger.exception("Google OAuth exchange failed")
            return Response(
                {"detail": "Google login failed."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not profile.get("verified_email") or not profile.get("email"):
            return Response(
                {"detail": "Google did not provide a verified email."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resident = lookup_resident_by_email(profile["email"])
        if not resident:
            return Response(
                {"detail": "This email is not in the resident registry."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = User.objects.filter(email__iexact=resident["email"]).first()
        if not user:
            base = resident["email"].split("@")[0]
            username = base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            user = User.objects.create(
                username=username,
                email=resident["email"],
                telephone=resident["telephone"],
                first_name=resident["first_name"],
                last_name=resident["last_name"],
                room_number=resident["room_number"],
                role=Role.RESIDENT,
                google_id=profile.get("id"),
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
        elif not user.google_id:
            user.google_id = profile.get("id")
            user.save(update_fields=["google_id"])
        if not user.is_active or not user.is_active_resident:
            return Response(
                {"detail": "This resident account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh = RefreshToken.for_user(user)
        return Response({"refresh": str(refresh), "access": str(refresh.access_token)})
