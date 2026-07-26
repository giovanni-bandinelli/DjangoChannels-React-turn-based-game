# backend/battleship/game.py

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