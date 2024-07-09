import json
import jwt
import random
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

class BattleshipConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_group_name = self.scope['url_route']['kwargs']['room_id']
        token = self.scope['url_route']['kwargs']['token']

        try:
            # Decode and verify JWT token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            self.username = payload['username']
            self.guest_id = payload['guest_id']
            print(self.username, self.guest_id)

            # Add player to the group (room)
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': f'{self.username} has joined the room',
                    'username': 'Server'
                }
            )

        except jwt.ExpiredSignatureError:
            await self.close(code=4001)  # Custom error code for token expired
        except jwt.InvalidTokenError:
            await self.close(code=4002)  # Custom error code for invalid token

    async def disconnect(self,close_code):
        # Remove player from the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': f'{self.username} has left the room',
                'username': 'Server'
            }
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']
        print(f"Received message type: {message_type}")

        if message_type == 'chat_message':
           
            print(f"Message content: {text_data_json['message']}")
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': text_data_json['message'],
                    'username': self.username                    
                }
            )
            print(f"Sent message to group: {text_data_json['message']}")

            
        elif message_type == 'randomize_ships':
            ships = self.randomize_ships()
            await self.send(text_data=json.dumps({
                'type': 'setup',
                'ships': ships
            }))

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        print(f"Sending message to WebSocket: {message} from {username}")
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message,
            'username': username
        }))

    def randomize_ships(self):
        ship_types = [
            {'type': 'Carrier', 'size': 5},
            {'type': 'Battleship', 'size': 4},
            {'type': 'Cruiser', 'size': 3},
            {'type': 'Submarine', 'size': 3},
            {'type': 'Destroyer', 'size': 2}
        ]

        def is_valid_placement(board, coordinates):
            return all(0 <= x < 10 and 0 <= y < 10 and not board[x][y] for x, y in coordinates)

        board = [[None for _ in range(10)] for _ in range(10)]
        ships = []

        for ship in ship_types:
            placed = False
            while not placed:
                is_vertical = random.choice([True, False])
                if is_vertical:
                    x = random.randint(0, 10 - ship['size'])
                    y = random.randint(0, 9)
                    coordinates = [(x + i, y) for i in range(ship['size'])]
                else:
                    x = random.randint(0, 9)
                    y = random.randint(0, 10 - ship['size'])
                    coordinates = [(x, y + i) for i in range(ship['size'])]

                if is_valid_placement(board, coordinates):
                    for x, y in coordinates:
                        board[x][y] = ship['type']
                    ships.append({'type': ship['type'], 'size': ship['size'], 'coordinates': [{'x': x, 'y': y} for x, y in coordinates]})
                    placed = True
        print("sending new randomized ship positions !")
        return ships
