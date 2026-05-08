from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin panel
    path('admin/', admin.site.urls),

    # All API endpoints live in users/urls.py
    path('api/auth/', include('users.urls')),
]