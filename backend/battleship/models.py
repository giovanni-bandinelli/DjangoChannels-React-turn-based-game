from django.db import models
import uuid

class GameRoom(models.Model):
    room_name = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    game_started = models.BooleanField(default=False)
    player1 = models.CharField(max_length=50)#idk how to assign a role to the 2 clients tbh
    player2 = models.CharField(max_length=50, null=True, blank=True)

    chat_history = models.JSONField(null=True, blank=True)

    def add_chat_message(self, username, message, id):
        if self.chat_history is None:
            self.chat_history = []
        self.chat_history.append({'username': username, 'message': message, 'ID':id})#id where ID should be generated to be safe and avoid adding it multiple time though consumers.py, perhaps in lobby.tsx?
        self.save()
    
    def get_chat_history(self):
        return self.chat_history if self.chat_history else []
'''
    

    player1_ships = models.JSONField(null=True, blank=True)
    player2_ships = models.JSONField(null=True, blank=True)

    player1_shots_fired = models.JSONField(null=True, blank=True)
    player2_shots_fired = models.JSONField(null=True, blank=True)

    current_turn = models.CharField(max_length=50, null=True, blank=True)

    trying to make the chat work first :/
''' 
   

