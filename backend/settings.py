"""Django settings for the Sherpherdsville complaint management system."""

from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, True))
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env.bool("DEBUG", default=True)
SECRET_KEY = env("SECRET_KEY", default=None)
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "development-only-change-me-before-deployment"
    else:
        raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG is false.")


def _host_name(value):
    """Return the hostname portion accepted by Django's ALLOWED_HOSTS."""
    value = value.strip()
    for scheme in ("https://", "http://"):
        if value.startswith(scheme):
            value = value[len(scheme):]
    return value.rstrip("/").split("/", 1)[0]


configured_hosts = env.list(
    "ALLOWED_HOSTS", default=["127.0.0.1", "localhost"]
)
# Railway injects this value for every service with a public domain. Including it
# automatically prevents DisallowedHost/400 errors when a domain is regenerated.
railway_public_domain = env("RAILWAY_PUBLIC_DOMAIN", default="")
ALLOWED_HOSTS = list(
    dict.fromkeys(
        host
        for host in (
            _host_name(value)
            for value in [*configured_hosts, railway_public_domain]
        )
        if host
    )
)
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        f"https://{host}"
        for host in ALLOWED_HOSTS
        if host not in ("127.0.0.1", "localhost", "*")
    ]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]
WSGI_APPLICATION = "backend.wsgi.application"
ASGI_APPLICATION = "backend.asgi.application"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=3),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}
AUTH_USER_MODEL = "api.User"

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)

database_url = env("DATABASE_URL", default=None)
if database_url:
    default_database = dj_database_url.parse(database_url, conn_max_age=600)
elif env("DB_NAME", default=None):
    default_database = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER", default=""),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
else:
    default_database = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }

DATABASES = {"default": default_database}
external_database_url = env("EXTERNAL_DATABASE_URL", default=None)
if external_database_url:
    DATABASES["external"] = dj_database_url.parse(
        external_database_url, conn_max_age=60
    )

EXTERNAL_RESIDENTS_TABLE = env("EXTERNAL_RESIDENTS_TABLE", default="residents")
EXTERNAL_EMAIL_COLUMN = env("EXTERNAL_EMAIL_COLUMN", default="email")
EXTERNAL_FIRST_NAME_COLUMN = env("EXTERNAL_FIRST_NAME_COLUMN", default="first_name")
EXTERNAL_LAST_NAME_COLUMN = env("EXTERNAL_LAST_NAME_COLUMN", default="last_name")
EXTERNAL_ROOM_COLUMN = env("EXTERNAL_ROOM_COLUMN", default="room_number")

EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default=(
        "django.core.mail.backends.console.EmailBackend"
        if DEBUG
        else "django.core.mail.backends.smtp.EmailBackend"
    ),
)
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@sherpherdsville.local")
EMAIL_TIMEOUT = 10
BREVO_API_KEY = env("BREVO_API_KEY", default="")
BREVO_SENDER_EMAIL = env("BREVO_SENDER_EMAIL", default=DEFAULT_FROM_EMAIL)

GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URI = env("GOOGLE_REDIRECT_URI", default="")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
OTP_DEBUG_RETURN_CODE = env.bool("OTP_DEBUG_RETURN_CODE", default=DEBUG)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
