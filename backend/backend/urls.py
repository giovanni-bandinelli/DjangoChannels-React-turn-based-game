# urls.py
from django.contrib import admin
from django.urls import path
from battleship.api_views import GuestLoginView, CreateRoomView, JoinRoomView, CheckRoomView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/guest-login/', GuestLoginView.as_view(), name='guest-login'),
    path('api/create-room/', CreateRoomView.as_view(), name='create-room'),
    path('api/join-room/<str:room_name>/', JoinRoomView.as_view(), name='join-room'),
    path('api/check-room/<str:room_name>/', CheckRoomView.as_view(), name='check-room'),
]
