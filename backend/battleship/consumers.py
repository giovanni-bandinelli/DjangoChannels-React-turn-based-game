

import json,jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings


class BattleshipConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_group_name = self.scope['url_route']['kwargs']['room_id']
        
        #JWT SHOULD BE TAKEN FROM STOEAGE ACTUALLy
        query_params = self.scope['query_string'].decode()
        token = query_params.split('=')[1]

        try:
            # Decode and verify JWT token
            payload = jwt.decode(token, settings.__getattribute__, algorithms=['HS256'])
            self.username = payload['username']
            self.guest_id = payload['guest_id']
            
            # Add player to the group (room)
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        except jwt.ExpiredSignatureError:
            await self.close(code=4001)  # Custom error code for token expired
        except jwt.InvalidTokenError:
            await self.close(code=4002)  # Custom error code for invalid token

    async def disconnect(self, close_code):
        # Remove player from the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']
        
        if message_type == 'place_ship':
            # Send a private message back to the player to update their own board
            await self.send(text_data=json.dumps({
                'type': 'update_own_board',
                'ship': text_data_json['ship'],
                'coordinates': text_data_json['coordinates']
            }))
        elif message_type == 'make_move':
            # Send a message to the group to handle the move
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'process_move',
                    'move': text_data_json['move'],
                    'player': text_data_json['player']
                }
            )

        elif message_type == 'chat_message':
            
            await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'player': text_data_json['player'],
                'message': text_data_json['message']
            }
        )

    async def chat_message(self, event):
        message = event['message']
        
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    async def process_move(self, event):
        move = event['move']
        player = event['player']

        # logica per controllare se il colpo è andato a segno
        # ipotizziamo che una roba del genere vada bene
        result = self.process_game_move(move, player)
        
        # Send the result back to the player who made the move
        await self.send(text_data=json.dumps({
            'type': 'update_enemy_board',
            'move': move,
            'result': result
        }))
        
        # Send the result to the opponent (for their own board update)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_own_board_opponent',
                'move': move,
                'result': result,
                'player': player
            }
        )
    
    async def update_own_board_opponent(self, event):
        move = event['move']
        result = event['result']
        player = event['player']

        # Send the update to the opponent (private message)
        await self.send(text_data=json.dumps({
            'type': 'update_own_board',
            'move': move,
            'result': result,
            'player': player
        }))

    def process_game_move(self, move, player):
        # Placeholder method to process the game move
        # Implement the logic to determine hit/miss and update the game state
        return {'status': 'hit' if some_condition else 'miss', 'coordinates': move}