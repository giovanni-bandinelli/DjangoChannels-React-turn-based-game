# backend/battleship/game.py

def find_hit_ship (ships, x, y):
    for ship in ships:
        if {'x': x, 'y': y} in ship['coordinates']:
            return ship
    return None

def all_ships_sunk(ships, shots):
    if not ships:
        return False
    all_ships_coordinates = [coord for ship in ships for coord in ship['coordinates']]
    return all(coord in shots for coord in all_ships_coordinates)