from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", obtain_auth_token, name="auth-token"),
    path("api/v1/", include("finance.urls")),
    # Keep the versioned API as the canonical contract while supporting the
    # unversioned paths used by the sprint requirements and mobile clients.
    path("api/auth/token/", obtain_auth_token, name="auth-token-unversioned"),
    path("api/", include("finance.urls")),
]

