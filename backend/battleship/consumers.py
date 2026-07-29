import asyncio, json, jwt, uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async
from .models import GameRoom
from .game import (find_hit_ship, all_ships_sunk, random_fleet,
                   bot_next_shot, sunk_cells_of)

BOT_ID = 'BOT'
BOT_THINKING_SECONDS = 0.7  # otherwise its whole streak lands in one blink

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

            # kept local until the check passes: self.room is what disconnect()
            # uses to decide whether there is anything to announce, and someone
            # who was refused never joined in the first place
            room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

            # both seats taken by someone else: this room is not a spectator
            # stand. Closed with a code the frontend can tell apart.
            taken = room.player1 is not None and room.player2 is not None
            if taken and self.guest_id not in (room.player1, room.player2):
                await self.close(code=4003)
                return

            self.room = room

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
            # which of their ships you have already finished off, so a reload
            # does not wipe the marks from the enemy board
            enemy_sunk = [s for s in enemy_ships
                          if all_ships_sunk([s], shots_fired_history or [])]

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
                'enemy_sunk': enemy_sunk,
                'you_ready': (room.player1_ready if self.guest_id == room.player1
                              else room.player2_ready),
                'opponent_ready': (room.player2_ready if self.guest_id == room.player1
                                   else room.player1_ready),
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
            await self.handle_randomize_ships()

        elif message_type == 'ready':
            await self.handle_ready()

        elif message_type == 'shot':
            await self.handle_shot(text_data_json['x'], text_data_json['y'])

        elif message_type == 'rematch':
            await self.handle_rematch()

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

    async def handle_ready(self):
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

        # only from the setup phase: without this, a stray 'ready' could drag a
        # finished game back into play
        if self.room.lobby_phase != 'setup':
            return

        # no payload: the ships are the ones the server generated and stored.
        # Being ready requires having them.
        if self.guest_id == self.room.player1 and self.room.player1_ships:
            self.room.player1_ready = True
            await sync_to_async(self.room.save)(update_fields=['player1_ready'])
        elif self.guest_id == self.room.player2 and self.room.player2_ships:
            self.room.player2_ready = True
            await sync_to_async(self.room.save)(update_fields=['player2_ready'])
        else:
            return

        # tell both sides who is ready: without this the other player sees
        # nothing happen and cannot tell whether they are the one holding up
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'ready_state',
                'player1': self.room.player1,
                'player1_ready': self.room.player1_ready,
                'player2_ready': self.room.player2_ready,
            }
        )

        # If both players are ready, transition to the game phase
        if self.room.player1_ready and self.room.player2_ready:
            self.room.lobby_phase = 'game'
            await sync_to_async(self.room.save)(update_fields=['lobby_phase'])

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

    async def ready_state(self, event):
        """Same broadcast, told from each player's own point of view."""
        you_are_player1 = self.guest_id == event['player1']
        await self.send(text_data=json.dumps({
            'type': 'ready_state',
            'you_ready': event['player1_ready'] if you_are_player1 else event['player2_ready'],
            'opponent_ready': event['player2_ready'] if you_are_player1 else event['player1_ready'],
        }))

    async def handle_randomize_ships(self):
        """Generates a layout, stores it, and sends it to whoever asked.

        The client never chooses its own ships, it only displays them: letting
        it send them back at 'ready' time would let a modified client place
        ships outside the board and be impossible to hit.
        """
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

        if self.room.lobby_phase not in ('waiting', 'setup'):
            return

        if self.guest_id == self.room.player1:
            field, is_ready = 'player1_ships', self.room.player1_ready
        elif self.guest_id == self.room.player2:
            field, is_ready = 'player2_ships', self.room.player2_ready
        else:
            return

        # once you declare yourself ready the layout is locked in
        if is_ready:
            return

        ships = random_fleet()
        setattr(self.room, field, ships)
        await sync_to_async(self.room.save)(update_fields=[field])

        await self.send(text_data=json.dumps({
            'type': 'new_ships_setup',
            'ships': ships
        }))

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
        fired = await self.apply_shot(self.guest_id, x, y)
        if fired:
            await self.play_bot_turn()

    async def apply_shot(self, shooter, x, y):
        """One shot, whoever fires it. Returns False if it was not allowed.

        Human and bot go through here on purpose: two copies of the turn rules
        would eventually disagree, and the bot would end up playing a slightly
        different game from the one you are playing.
        """
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

        if self.room.lobby_phase != 'game' or self.room.current_turn != shooter:
            return False

        if self.room.player1 == shooter:
            shots_field = 'player1_shots_fired'
            enemy_ships, opponent = self.room.player2_ships, self.room.player2
        else:
            shots_field = 'player2_shots_fired'
            enemy_ships, opponent = self.room.player1_ships, self.room.player1

        shots = getattr(self.room, shots_field) or []
        # same cell twice is ignored: a repeated hit would otherwise grant endless turns
        if any(shot['x'] == x and shot['y'] == y for shot in shots):
            return False

        enemy_ships = enemy_ships or []
        ship = find_hit_ship(enemy_ships, x, y)
        hit = ship is not None
        shots.append({'x': x, 'y': y, 'hit': hit})
        setattr(self.room, shots_field, shots)

        # a fleet of one is still a fleet: the same function that decides the
        # winner also answers "is this single ship finished?"
        sunk_ship = ship if hit and all_ships_sunk([ship], shots) else None

        if not hit:
            self.room.current_turn = opponent

        winner = shooter if all_ships_sunk(enemy_ships, shots) else None
        if winner:
            self.room.lobby_phase = 'finished'

        await sync_to_async(self.room.save)(
            update_fields=[shots_field, 'current_turn', 'lobby_phase']
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'shot_result',
                'shooter': shooter,
                'x': x,
                'y': y,
                'hit': hit,
                'sunk_ship': sunk_ship,
                'current_turn': self.room.current_turn,
                'winner': winner,
            }
        )
        return True

    async def play_bot_turn(self):
        """Fires for the bot until it misses or wins.

        The bot has no socket of its own, so nobody would ever deliver its turn
        to it: whoever moved last drives it from the server side.
        """
        while self.room.vs_bot and self.room.current_turn == BOT_ID \
                and self.room.lobby_phase == 'game':
            shots = self.room.player2_shots_fired or []
            # it is told which ships it has already finished, exactly like a
            # human opponent would be
            sunk = sunk_cells_of(self.room.player1_ships or [], shots)

            move = bot_next_shot(shots, sunk_cells=sunk)
            if move is None:
                return

            await asyncio.sleep(BOT_THINKING_SECONDS)  # let the shot be seen
            if not await self.apply_shot(BOT_ID, move['x'], move['y']):
                return

    async def handle_rematch(self):
        """Puts the room back to the setup phase, keeping the same two players."""
        self.room = await sync_to_async(GameRoom.objects.get)(room_name=self.room_group_name)

        if self.room.lobby_phase != 'finished':
            return
        if self.guest_id not in (self.room.player1, self.room.player2):
            return

        self.room.lobby_phase = 'setup'
        self.room.player1_ships = None
        self.room.player1_ready = False
        self.room.player1_shots_fired = None
        self.room.player2_shots_fired = None
        self.room.current_turn = self.room.player1

        if self.room.vs_bot:
            # the bot cannot press anything: it re-deploys and is ready again
            self.room.player2_ships = random_fleet()
            self.room.player2_ready = True
        else:
            self.room.player2_ships = None
            self.room.player2_ready = False

        await sync_to_async(self.room.save)(update_fields=[
            'lobby_phase', 'player1_ships', 'player2_ships',
            'player1_ready', 'player2_ready',
            'player1_shots_fired', 'player2_shots_fired', 'current_turn',
        ])

        await self.channel_layer.group_send(
            self.room_group_name, {'type': 'rematch_started'}
        )

    async def rematch_started(self, event):
        await self.send(text_data=json.dumps({'type': 'rematch_started'}))

    async def shot_result(self, event):
        await self.send(text_data=json.dumps({
            'type': 'shot_result',
            'by_you': event['shooter'] == self.guest_id,
            'x': event['x'],
            'y': event['y'],
            'hit': event['hit'],
            'sunk_ship': event['sunk_ship'],
            'your_turn': event['current_turn'] == self.guest_id,
            'game_over': event['winner'] is not None,
            'you_won': event['winner'] == self.guest_id,
        }))

