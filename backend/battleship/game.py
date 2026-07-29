# backend/battleship/game.py

import random

BOARD_SIZE = 10
ORTHOGONAL = ((1, 0), (-1, 0), (0, 1), (0, -1))

SHIP_TYPES = (
    {'type': 'Carrier', 'size': 5},
    {'type': 'Battleship', 'size': 4},
    {'type': 'Cruiser', 'size': 3},
    {'type': 'Submarine', 'size': 3},
    {'type': 'Destroyer', 'size': 2},
)


def random_fleet(size=BOARD_SIZE, rng=random):
    """A legal random placement of the five ships, no overlaps.

    Lives here rather than on the consumer because the API view needs it too,
    to hand a fleet to the bot when the room is created.
    """
    board = [[None] * size for _ in range(size)]
    fleet = []

    for ship in SHIP_TYPES:
        while True:
            vertical = rng.choice([True, False])
            if vertical:
                x = rng.randint(0, size - ship['size'])
                y = rng.randint(0, size - 1)
                cells = [(x + i, y) for i in range(ship['size'])]
            else:
                x = rng.randint(0, size - 1)
                y = rng.randint(0, size - ship['size'])
                cells = [(x, y + i) for i in range(ship['size'])]

            if all(board[a][b] is None for a, b in cells):
                for a, b in cells:
                    board[a][b] = ship['type']
                fleet.append({
                    'type': ship['type'],
                    'size': ship['size'],
                    'coordinates': [{'x': a, 'y': b} for a, b in cells],
                })
                break

    return fleet


def sunk_cells_of(ships, shots):
    """Coordinates belonging to ships that are completely destroyed."""
    return [coord for ship in ships
            if all_ships_sunk([ship], shots)
            for coord in ship['coordinates']]

def find_hit_ship (ships, x, y):
    for ship in ships:
        if {'x': x, 'y': y} in ship['coordinates']:
            return ship
    return None

def all_ships_sunk(ships, shots):
    if not ships:
        return False
    hit_cells = {(shot['x'], shot['y']) for shot in shots}
    all_ships_coordinates = [coord for ship in ships for coord in ship['coordinates']]
    return all((coord['x'], coord['y']) in hit_cells for coord in all_ships_coordinates)


def bot_next_shot(shots, sunk_cells=(), size=BOARD_SIZE, rng=random):
    """Where the bot fires next, given only what it is allowed to know.

    It never sees the enemy ships: it reasons from its own shots and from the
    cells it has been told belong to ships already sunk.

    Three modes, in order of priority:
      1. two or more hits in a line -> keep going at either end of that line
      2. a lone hit -> try the four orthogonal neighbours, never diagonals
      3. nothing to chase -> hunt on a checkerboard, because the smallest ship
         is two cells long and cannot hide between two squares of one colour

    Returns {'x': int, 'y': int}, or None when the board is exhausted.
    """
    fired = {(shot['x'], shot['y']) for shot in shots}
    sunk = {(cell['x'], cell['y']) for cell in sunk_cells}
    # hits belonging to ships still afloat: chasing a sunk one wastes turns
    open_hits = {(shot['x'], shot['y']) for shot in shots if shot['hit']} - sunk

    def usable(cell):
        x, y = cell
        return 0 <= x < size and 0 <= y < size and cell not in fired

    line_ends = set()
    for x, y in open_hits:
        for dx, dy in ORTHOGONAL:
            if (x + dx, y + dy) not in open_hits:
                continue

            cx, cy = x, y
            while (cx + dx, cy + dy) in open_hits:
                cx, cy = cx + dx, cy + dy
            line_ends.add((cx + dx, cy + dy))
    candidates = sorted(cell for cell in line_ends if usable(cell))
    if candidates:
        return {'x': candidates[0][0], 'y': candidates[0][1]}

    around = {(x + dx, y + dy) for x, y in open_hits for dx, dy in ORTHOGONAL}
    candidates = sorted(cell for cell in around if usable(cell))
    if candidates:
        return {'x': candidates[0][0], 'y': candidates[0][1]}
    
    free = [(x, y) for x in range(size) for y in range(size) if (x, y) not in fired]
    if not free:
        return None
    checkerboard = [cell for cell in free if (cell[0] + cell[1]) % 2 == 0]
    x, y = rng.choice(checkerboard or free)
    return {'x': x, 'y': y}