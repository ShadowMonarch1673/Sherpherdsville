from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.core.files.storage import FileSystemStorage
from django.urls import reverse


class SignedMediaStorage(FileSystemStorage):
    """Store uploads on disk and return expiring, tamper-resistant URLs."""

    def url(self, name):
        normalized_name = str(name).replace("\\", "/")
        token = signing.dumps(
            normalized_name,
            key=settings.SECRET_KEY,
            salt=settings.MEDIA_SIGNING_SALT,
            compress=True,
        )
        path = reverse("protected-media", kwargs={"path": normalized_name})
        return f"{path}?{urlencode({'token': token})}"
