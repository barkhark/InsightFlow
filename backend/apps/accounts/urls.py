from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, LogoutView, MeView, GoogleAuthView, RegisterView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('google/', GoogleAuthView.as_view(), name='auth-google'),
    path('register/', RegisterView.as_view(), name='auth-register'),
]
