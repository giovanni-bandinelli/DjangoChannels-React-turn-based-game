from django.db import models
import uuid

class GameRoom(models.Model):

    room_name = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    game_started = models.BooleanField(default=False)
    chat_history = models.JSONField(null=True, blank=True)
    lobby_phase = models.CharField(max_length=50, default='waiting')
    current_turn = models.CharField(max_length=50, null=True, blank=True)#idk what this should actually be, but it will be used like this:>Its p1 turn > p1's shot hits enemy ship > p1 gets to shoot again > goes on until miss or victory > if misses, turn is passed to p2. write a dummy function in consumer to manage the game logic, its literally just this after all

    player1 = models.CharField(max_length=50, null=True)#stores unique guest_id taken from generated jwt
    player2 = models.CharField(max_length=50, null=True)

    player1_ready = models.BooleanField(default=False)#when both are true consumers.py sets phase to 'game' and match starts
    player2_ready = models.BooleanField(default=False)

    player1_ships = models.JSONField(null=True, blank=True)#store player's ship here may be useless afterall since they are stored in local storage already so client UI doesnt need this, but could be used to check if shot hits or misses perhaps?
    player2_ships = models.JSONField(null=True, blank=True)

    player1_shots_fired = models.JSONField(null=True, blank=True)
    player2_shots_fired = models.JSONField(null=True, blank=True)

    def add_chat_message(self, username, message, id):
        if self.chat_history is None:
            self.chat_history = []
        new_message = {'username': username, 'message': message, 'ID': id}
        if new_message not in self.chat_history:
            
            self.chat_history.append(new_message)
            self.save()

    def get_chat_history(self):
        return self.chat_history if self.chat_history else []
    
    def get_player_ships(self, guest_id):
        if self.player1 == guest_id:
            return self.player1_ships
        elif self.player2 == guest_id:
            return self.player2_ships
        return []

    def get_shots_fired_history(self, guest_id):
        if self.player1 == guest_id:
            return self.player1_shots_fired
        elif self.player2 == guest_id:
            return self.player2_shots_fired
        return []
    
    #idk probably pointless
    def get_shots_received_history(self, guest_id):
        if self.player1 == guest_id:
            return self.player2_shots_fired
        elif self.player2 == guest_id:
            return self.player1_shots_fired
        return []
    
