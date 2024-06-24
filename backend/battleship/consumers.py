import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BattleshipConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'battleship_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data['type']

        if message_type == 'chat_message':
            await self.handle_chat_message(data)

        elif message_type == 'game_setup':
            await self.handle_game_setup(data)#lobby settings

        elif message_type == 'log_message':
            await self.handle_log_message(data)

        elif message_type == 'game_update':
            await self.handle_game_update(data)#player actions

        elif message_type == 'game_start':
            await self.handle_game_start(data)

        elif message_type == 'game_end':
            await self.handle_game_end(data)
        else:
            # Idk
            pass

    async def handle_chat_message(self, data):
        message = data['message']
        # You can optionally save the chat message to a database or handle it as needed
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    async def handle_log_message(self, data):
        log_message = data['log']
        # Handle storing or processing log messages (e.g., logging player actions)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'log_message',
                'log': log_message
            }
        )

    async def handle_game_update(self, data):
        game_update = data['update']
        # Handle game updates, such as player moves, state changes, etc.
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'update': game_update
            }
        )

    async def handle_game_start(self, data):
        # Handle game start logic
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_start',
                'message': 'Game has started!'
            }
        )

    async def handle_game_end(self, data):
        # Handle game end logic, including determining the winner
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_end',
                'winner': data['winner']
            }
        )

    async def chat_message(self, event):
        message = event['message']
        # Send chat message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))

    async def log_message(self, event):
        log_message = event['log']
        # Send log message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'log_message',
            'log': log_message
        }))

    async def game_update(self, event):
        game_update = event['update']
        # Send game update to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'update': game_update
        }))

    async def game_start(self, event):
        message = event['message']
        # Send game start message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_start',
            'message': message
        }))

    async def game_end(self, event):
        winner = event['winner']
        # Send game end message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_end',
            'winner': winner
        }))
        
    async def handle_game_setup(self, data):
        time_per_turn = data['time_per_turn']
        minutes_per_player = data['minutes_per_player']
        who_plays_first = data['who_plays_first']

        # Store game setup data in the database or session if needed
        # For now, just broadcast the setup data to all players in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_setup',
                'time_per_turn': time_per_turn,
                'minutes_per_player': minutes_per_player,
                'who_plays_first': who_plays_first
            }
        )