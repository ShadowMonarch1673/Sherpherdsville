from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from api.media import serve_protected_media

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('media/<path:path>', serve_protected_media, name='protected-media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
