from django.db import models
import uuid

class GameRoom(models.Model):
    room_name = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    player1 = models.CharField(max_length=50)
    player2 = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    game_started = models.BooleanField(default=False)
