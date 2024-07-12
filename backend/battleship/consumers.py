import json,jwt,uuid,random
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async
from .models import GameRoom

class BattleshipConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = self.scope['url_route']['kwargs']['room_id']
        token = self.scope['url_route']['kwargs']['token']

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            self.username = payload['username']
            self.guest_id = payload['guest_id']

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)
            chat_history = await sync_to_async(self.room.get_chat_history)()

            await self.send(text_data=json.dumps({
                'type': 'restore_lobby_history',
                'chat_history': chat_history
            }))

            msg = f'{self.username} has joined the room'
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': msg,
                    'username': 'Server'
                }
            )
            message_id = str(uuid.uuid4())
            await sync_to_async(self.room.add_chat_message)('server', msg, message_id)

        except jwt.ExpiredSignatureError:#i dont really know what to do with this to be honest
            await self.close(code=4001)
        except jwt.InvalidTokenError:
            await self.close(code=4002)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        msg = f'{self.username} has left the room'
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': msg,
                'username': 'Server'
            }
        )

        message_id = str(uuid.uuid4())
        await sync_to_async(self.room.add_chat_message)('server', msg, message_id)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']

        if message_type == 'chat_message':
            message = text_data_json['message']
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': self.username
                }
            )

            message_id = str(uuid.uuid4())
            await sync_to_async(self.room.add_chat_message)(self.username, message, message_id)

        elif message_type == 'randomize_ships':
            ships = self.randomize_ships()
            await self.send(text_data=json.dumps({
                'type': 'setup',
                'ships': ships
            }))

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message,
            'username': username
        }))

    def randomize_ships(self):#could totally be improved but i dont know how
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