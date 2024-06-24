from django.contrib import admin
from django.urls import path
from battleship.api_views import CreateRoomView, JoinRoomView, CheckRoomView, UsernameOnlyTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/create-room/', CreateRoomView.as_view(), name='create-room'),
    path('api/join-room/<str:room_name>/', JoinRoomView.as_view(), name='join-room'),
    path('api/check-room/<str:room_name>/', CheckRoomView.as_view(), name='check-room'),
    path('api/token/', UsernameOnlyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
