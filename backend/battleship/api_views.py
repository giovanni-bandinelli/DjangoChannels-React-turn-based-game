# api_views.py

import jwt
import uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated 
from rest_framework import status
from .models import GameRoom

class GuestLoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        if username:
            user_uuid = str(uuid.uuid4())
            
            # Create JWT token
            payload = {
                'guest_id': user_uuid,
                'username': username
            }
            token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
            
            return Response({'token': token}, status=status.HTTP_200_OK)
        
        return Response("username required", status=status.HTTP_400_BAD_REQUEST)

class CreateRoomView(APIView):
    
    def post(self, request):
        token = request.headers.get("Authorization").replace("Bearer ","")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms='HS256')
        username = payload.get('username')
        if username:
            room_name = uuid.uuid4()  # Generate a random UUID for the room name
            room = GameRoom.objects.create(room_name=room_name)
            return Response({"room_name": str(room_name)}, status=status.HTTP_201_CREATED)
        return Response("token missing", status=status.HTTP_400_BAD_REQUEST)

class JoinRoomView(APIView):
    def post(self, request, room_name):
        token = request.headers.get("Authorization").replace("Bearer ","")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms='HS256')
        username = payload.get('username')
        if username:
            try:
                room = GameRoom.objects.get(room_name=room_name)
                if room.player2:   # If the room has a second player already, the lobby is full and 3rd/N-th gets error
                    return Response({"error": "Room is full."}, status=status.HTTP_400_BAD_REQUEST)
                room.player2 = username
                room.game_started = True
                room.save()
                return Response({"message": "Joined room."}, status=status.HTTP_200_OK)
            except GameRoom.DoesNotExist:
                return Response({"error": "Room does not exist."}, status=status.HTTP_404_NOT_FOUND)
        return Response("token missing", status=status.HTTP_400_BAD_REQUEST)

class CheckRoomView(APIView):
    def get(self, request, room_name):
        exists = GameRoom.objects.filter(room_name=room_name).exists()
        return Response({"room_exists": exists}, status=status.HTTP_200_OK)
