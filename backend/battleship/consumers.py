import json, jwt, uuid, random
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async
from .models import GameRoom
from .game import find_hit_ship, all_ships_sunk

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

            # Check if player1 or player2 is None and assign self.guest_id accordingly
            if self.room.player1 is None and self.room.player2 != self.guest_id:
                self.room.player1 = self.guest_id
                self.room.current_turn = self.room.player1
                await sync_to_async(self.room.save)()
            elif self.room.player2 is None and self.room.player1 != self.guest_id:
                self.room.player2 = self.guest_id
                self.room.lobby_phase = 'setup'
                await sync_to_async(self.room.save)()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'phase_change',
                        'phase': self.room.lobby_phase
                    }
                )

            lobby_phase = self.room.lobby_phase
            chat_history = await sync_to_async(self.room.get_chat_history)()
            your_ships = await sync_to_async(self.room.get_player_ships)(self.guest_id)
            your_turn = self.room.current_turn == self.guest_id
            shots_fired_history = await sync_to_async(self.room.get_shots_fired_history)(self.guest_id)
            shots_received_history = await sync_to_async(self.room.get_shots_received_history)(self.guest_id)
            
            enemy_ships = (self.room.player2_ships if self.room.player1 == self.guest_id
                           else self.room.player1_ships) or []
            you_won = all_ships_sunk(enemy_ships, shots_fired_history or [])

            await self.send(text_data=json.dumps({
                'type': 'restore_game_history',
                'lobby_phase': lobby_phase,
                'chat_history': chat_history,
                'your_turn': your_turn,
                'your_ships': your_ships,
                'shots_fired': shots_fired_history,
                'shots_received': shots_received_history,
                'game_over': lobby_phase == 'finished',
                'you_won': you_won,
            }))

            msg = f'{self.username} has joined the room'
            await self.store_chat_message('Server', msg)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': msg,
                    'username': 'Server',
                }
            )

        except jwt.ExpiredSignatureError:
            await self.close(code=4001)
        except jwt.InvalidTokenError:
            await self.close(code=4002)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        if not hasattr(self, 'room'):
            return

        msg = f'{self.username} disconnected from the room'
        await self.store_chat_message('Server', msg)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': msg,
                'username': 'Server'
            }
        )

    async def store_chat_message(self, username, message):
        await sync_to_async(self.room.refresh_from_db)(fields=['chat_history'])
        await sync_to_async(self.room.add_chat_message)(
            username, message, str(uuid.uuid4())
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json['type']

        if message_type == 'chat_message':
            message = text_data_json['message']
            username = text_data_json['username']
            await self.store_chat_message(username, message)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': username
                }
            )

        elif message_type == 'phase_change':
            phase = text_data_json['phase']
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'phase_change',
                    'phase': phase,
                }
            )
            self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)
            self.room.lobby_phase = phase
            await sync_to_async(self.room.save)()
           


        elif message_type == 'randomize_ships':
            ships = self.randomize_ships()
            await self.send(text_data=json.dumps({
                'type': 'new_ships_setup',
                'ships': ships
            }))
        
        elif message_type == 'ready':
            ships = text_data_json['ships']
            if ships:
                await self.handle_ready({'ships': ships})

        elif message_type == 'shot':
            await self.handle_shot(text_data_json['x'], text_data_json['y'])

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'username': event['username']
        }))
      
    async def phase_change(self, event):
        phase = event['phase']
        await self.send(text_data=json.dumps({
            'type': 'phase_change',
            'phase': phase,
        }))
        print(f'{self.username}\'s lobby phase taken from the room instance: {self.room.lobby_phase}')

    async def handle_ready(self, event):
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)
        # Update the readiness state and ship configuration for the player
        if self.room.player1 == self.guest_id and not self.room.player1_ready:
            self.room.player1_ready = True
            self.room.player1_ships = event['ships']
        elif self.room.player2 == self.guest_id and not self.room.player2_ready:
            self.room.player2_ready = True
            self.room.player2_ships = event['ships']
        
        await sync_to_async(self.room.save)()
        
        # If both players are ready, transition to the game phase
        if self.room.player1_ready and self.room.player2_ready:
            self.room.lobby_phase = 'game'
            await sync_to_async(self.room.save)()

            # Notify all players that the game phase has changed to 'game'
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'phase_change',
                    'phase': 'game'
                }
            )

            # Prepare the initial game state for all players
            for player in [self.room.player1, self.room.player2]:
                guest_id = player
                your_turn = self.room.current_turn == guest_id
                your_ships = await sync_to_async(self.room.get_player_ships)(guest_id)
                shots_fired_history = await sync_to_async(self.room.get_shots_fired_history)(guest_id)
                shots_received_history = await sync_to_async(self.room.get_shots_received_history)(guest_id)
                
                # Send the initial game state to the player
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'start_game',
                        'guest_id': guest_id,
                        'your_turn': your_turn,
                        'your_ships': your_ships,
                        'shots_fired': shots_fired_history,
                        'shots_received': shots_received_history
                    }
                )

        # Print the current state for debugging purposes
        print(f'p1 ready: {self.room.player1_ships}, p2 ready: {self.room.player2_ships}')

    async def start_game(self, event):
        if event['guest_id'] == self.guest_id:
            await self.send(text_data=json.dumps({
                'type': 'game_started',
                'your_turn': event['your_turn'],
                'your_ships': event['your_ships'],
                'shots_fired': event['shots_fired'],
                'shots_received': event['shots_received']
            }))

    async def handle_shot(self, x, y):
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

        if self.room.lobby_phase != 'game' or self.room.current_turn != self.guest_id:
            return

        if self.room.player1 == self.guest_id:
            shots_field = 'player1_shots_fired'
            enemy_ships, opponent = self.room.player2_ships, self.room.player2
        else:
            shots_field = 'player2_shots_fired'
            enemy_ships, opponent = self.room.player1_ships, self.room.player1

        shots = getattr(self.room, shots_field) or []
        # same cell twice is ignored: a repeated hit would otherwise grant endless turns
        if any(shot['x'] == x and shot['y'] == y for shot in shots):
            return

        enemy_ships = enemy_ships or []
        hit = find_hit_ship(enemy_ships, x, y) is not None
        shots.append({'x': x, 'y': y, 'hit': hit})
        setattr(self.room, shots_field, shots)

        if not hit:
            self.room.current_turn = opponent

        winner = self.guest_id if all_ships_sunk(enemy_ships, shots) else None
        if winner:
            self.room.lobby_phase = 'finished'

        await sync_to_async(self.room.save)(
            update_fields=[shots_field, 'current_turn', 'lobby_phase']
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'shot_result',
                'shooter': self.guest_id,
                'x': x,
                'y': y,
                'hit': hit,
                'current_turn': self.room.current_turn,
                'winner': winner,
            }
        )

    async def shot_result(self, event):
        await self.send(text_data=json.dumps({
            'type': 'shot_result',
            'by_you': event['shooter'] == self.guest_id,
            'x': event['x'],
            'y': event['y'],
            'hit': event['hit'],
            'your_turn': event['current_turn'] == self.guest_id,
            'game_over': event['winner'] is not None,
            'you_won': event['winner'] == self.guest_id,
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
        return ships
