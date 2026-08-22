from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    MeView,
    ComplaintListCreateView,
    ComplaintDetailView,
    ComplaintAttachmentUploadView,
    NotificationListView,
    NotificationMarkReadView,
    GoogleLoginRedirectView,
    GoogleLoginCallbackView,
    CommentListCreateView,
    ReviewCreateView,
    RequestOTPView,
    VerifyOTPView,
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("login/refresh/", TokenRefreshView.as_view(), name="login_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("complaints/", ComplaintListCreateView.as_view(), name="complaint-list-create"),
    path("complaints/<int:pk>/", ComplaintDetailView.as_view(), name="complaint-detail"),
    path("complaints/<int:complaint_id>/attachments/", ComplaintAttachmentUploadView.as_view(), name="complaint-attachment-upload"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
    path("auth/google/login/", GoogleLoginRedirectView.as_view(), name="google-login"),
    path("auth/google/callback/", GoogleLoginCallbackView.as_view(), name="google-callback"),
    path("complaints/<int:complaint_id>/comments/", CommentListCreateView.as_view(), name="complaint-comments"),
    path("complaints/<int:complaint_id>/review/", ReviewCreateView.as_view(), name="complaint-review"),
    path("auth/request-otp/", RequestOTPView.as_view(), name="request-otp"),
    path("auth/verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
]