import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import GameRoom
from .serializers import UsernameSerializer, UsernameOnlyTokenObtainPairSerializer


class UsernameOnlyTokenObtainPairView(TokenObtainPairView):
    serializer_class = UsernameOnlyTokenObtainPairSerializer

    
class CreateRoomView(APIView):
    def post(self, request):
        serializer = UsernameSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            room_name = uuid.uuid4()  # Generate a random UUID for the room name
            room = GameRoom.objects.create(room_name=room_name, player1=username)
            return Response({"room_name": str(room_name)}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JoinRoomView(APIView):
    def post(self, request, room_name):
        serializer = UsernameSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            try:
                room = GameRoom.objects.get(room_name=room_name)
                if room.player2:   #if the room has a second player already, the lobby is full and 3rd/ N-th gets error
                    return Response({"error": "Room is full."}, status=status.HTTP_400_BAD_REQUEST)
                room.player2 = username
                room.game_started = True
                room.save()
                return Response({"message": "Joined room."}, status=status.HTTP_200_OK)
            except GameRoom.DoesNotExist:
                return Response({"error": "Room does not exist."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckRoomView(APIView):
    def get(self, request, room_name):
        exists = GameRoom.objects.filter(room_name=room_name).exists()
        return Response({"room_exists": exists}, status=status.HTTP_200_OK)