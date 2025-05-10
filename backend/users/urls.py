from django.urls import path
from .views import UserRegister, UserLogin, UserDetails, UserDownloads

urlpatterns = [
    path('register/', UserRegister.as_view(), name='register'),
    path('login/', UserLogin.as_view(), name='login'),
    path('user/', UserDetails.as_view(), name='user_details'),
    path('downloads/', UserDownloads.as_view(), name='user_downloads'),
]