from django.contrib import admin

# Register your models here.
from .models import GameRoom


class GameRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'room_name', 'player1', 'player2', 'game_started', 'created_at']


admin.site.register(GameRoom, GameRoomAdmin)