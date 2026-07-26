from battleship.game import find_hit_ship,all_ships_sunk

NAVI = [{'type': 'Destroyer', 'size': 3,
         'coordinates': [{'x': 0, 'y': 0}, {'x': 0, 'y': 1}, {'x': 0, 'y': 2}]},
        {'type': 'Submarine', 'size': 3,
        'coordinates': [{'x': 1, 'y': 1}, {'x': 1, 'y': 2}, {'x': 1, 'y': 3}]},
        {'type': 'Cruiser', 'size': 3,
        'coordinates': [{'x': 2, 'y': 2}, {'x': 2, 'y': 3}, {'x': 2, 'y': 4}]}
        ]

class TestFindHitShip:
    def test_colpo_a_segno_restituisce_la_nave(self):
        assert find_hit_ship(NAVI, 0, 1) == NAVI[0]

    def test_colpo_a_vuoto_restituisce_none(self):
        assert find_hit_ship(NAVI, 5, 5) is None


class TestAllShipsSunk:
    def test_tutte_le_navi_affondate(self):
        shots = [c for ship in NAVI for c in ship['coordinates']]
        assert all_ships_sunk(NAVI, shots) is True

    def test_una_sola_nave_affondata_non_basta(self):
        shots = [{'x': 0, 'y': 0}, {'x': 0, 'y': 1}, {'x': 0, 'y': 2}]
        assert all_ships_sunk(NAVI, shots) is False

    def test_tutte_le_navi_colpite_tranne_uno_spot(self):
        shots = [{'x': 0, 'y': 0}, {'x': 0, 'y': 1}]
        assert all_ships_sunk(NAVI, shots) is False

    def test_nessuna_nave(self):
        shots = [{'x': 0, 'y': 0}, {'x': 0, 'y': 1}]
        assert all_ships_sunk([], shots) is False

    def test_nessun_colpo(self):
        shots = []
        assert all_ships_sunk(NAVI, shots) is False
