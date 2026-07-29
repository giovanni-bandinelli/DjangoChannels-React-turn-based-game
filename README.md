# Battleship Online

A two-player Battleship game played in the browser in real time, over WebSockets.
Create a room, send the link (or let the other player scan the QR code), place
your fleet and play. No account needed: players get a guest identity.

You can also play against a bot, so the game is playable on your own.

## Stack

**Backend** — Django 6, Django Channels (ASGI, Daphne), SQLite, JWT for guest
identities.
**Frontend** — React 18, TypeScript, Vite, MUI.

## Design notes

A few decisions worth explaining, because they are the reason the code looks the
way it does.

**Game rules live outside the framework.** `battleship/game.py` has no Django
import at all: it takes lists and dictionaries and returns lists and
dictionaries. Hit detection, sinking, victory and the bot strategy are all in
there, which means they can be tested without a database, without settings and
without a WebSocket. The consumer is only a delivery boy.

**The server owns the ships.** Fleets are generated and stored server side and
the client never sends them back. An earlier version accepted the layout from
the client at "ready" time, which let a modified client place ships outside the
board and be impossible to hit.

**Derived state is not stored.** The winner of a game is not a column in the
database: it is recomputed from the shots when a client reconnects. Same idea
for which enemy ships are already sunk.

**One origin.** In development Vite proxies `/api` and `/ws` to Django, so the
browser only ever talks to a single port. This is also what makes the game
reachable from a phone on the same network, and it removes CORS entirely.

**The bot runs in its own task.** A consumer dispatches one message at a time,
so playing the bot's whole turn inside the message handler made its shots pile
up and land on screen all at once. It runs in an `asyncio` task instead, and is
resumed on reconnect if the page is reloaded mid-turn.

**Human and bot share the shot code.** Both go through `apply_shot(shooter, x, y)`,
so there is exactly one implementation of the turn rules.

## The bot

Hunt and target: it searches on a checkerboard pattern (the smallest ship is two
cells long, so half the board is enough to find everything), switches to chasing
orthogonal neighbours on a hit, and follows the line once it has two hits in a
row. It is told which ships it has already sunk, exactly like a human opponent
would be.

## Running it locally

Backend, from `backend/`:

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
python manage.py migrate
```

```bash
python manage.py runserver
```

Frontend, from `frontend/`:

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. Configuration is optional in development:
copy `backend/.env.example` to `backend/.env` only if you want to override the
defaults. With `DJANGO_DEBUG=False` the project refuses to start unless
`DJANGO_SECRET_KEY` is set.

## Tests

```bash
python -m pytest
```

They cover the pure game logic: hit detection, sinking, victory conditions and
the bot's targeting rules.

## Housekeeping

Rooms are created on every game and nothing removes them, so there is a
management command for it, meant to be scheduled daily:

```bash
python manage.py cleanup_rooms --dry-run
```

## Known limitations

- **Single process only.** The channel layer is in memory, so two players must
  be served by the same process. Running more than one worker needs Redis.
- **Not deployed yet**: it runs locally.
- Ships can only be placed randomly, there is no drag & drop placement.
- A dropped connection cannot be told apart from someone abandoning the game:
  both show up as a disconnection, with no grace period.
