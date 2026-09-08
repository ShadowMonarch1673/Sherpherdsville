import mimetypes

from django.conf import settings
from django.core import signing
from django.core.files.storage import default_storage
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.utils.crypto import constant_time_compare
from django.utils.http import content_disposition_header
from django.views.decorators.http import require_safe


@require_safe
def serve_protected_media(request, path):
    """Serve a stored upload only when its short-lived signature is valid."""

    token = request.GET.get("token", "")
    try:
        signed_path = signing.loads(
            token,
            key=settings.SECRET_KEY,
            salt=settings.MEDIA_SIGNING_SALT,
            max_age=settings.MEDIA_FILE_URL_TTL,
        )
    except (signing.BadSignature, signing.SignatureExpired):
        return HttpResponseForbidden("This image link is invalid or has expired.")

    if not isinstance(signed_path, str) or not constant_time_compare(signed_path, path):
        return HttpResponseForbidden("This image link is invalid or has expired.")

    try:
        media_file = default_storage.open(signed_path, "rb")
    except (FileNotFoundError, OSError):
        raise Http404("Image not found")

    content_type = mimetypes.guess_type(signed_path)[0] or "application/octet-stream"
    response = FileResponse(media_file, content_type=content_type)
    response["Content-Disposition"] = content_disposition_header(
        False, signed_path.rsplit("/", 1)[-1]
    )
    response["Cache-Control"] = f"private, max-age={settings.MEDIA_FILE_URL_TTL}"
    response["Cross-Origin-Resource-Policy"] = "cross-origin"
    response["X-Content-Type-Options"] = "nosniff"
    return response
