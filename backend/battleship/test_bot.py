import random

from battleship.game import bot_next_shot


def shot(x, y, hit=False):
    return {'x': x, 'y': y, 'hit': hit}


class TestHuntMode:
    def test_primo_colpo_su_casella_della_scacchiera(self):
        for seed in range(20):
            result = bot_next_shot([], rng=random.Random(seed))
            assert (result['x'] + result['y']) % 2 == 0

    def test_non_spara_mai_dove_ha_gia_sparato(self):
        shots = [shot(x, y) for x in range(10) for y in range(10)
                 if (x + y) % 2 == 0 and not (x == 9 and y == 9)]
        result = bot_next_shot(shots, rng=random.Random(0))
        assert (result['x'], result['y']) not in {(s['x'], s['y']) for s in shots}

    def test_griglia_esaurita_restituisce_none(self):
        shots = [shot(x, y) for x in range(10) for y in range(10)]
        assert bot_next_shot(shots) is None


class TestTargetMode:
    def test_dopo_un_colpo_spara_adiacente_non_diagonale(self):
        result = bot_next_shot([shot(4, 4, hit=True)])
        assert (result['x'], result['y']) in {(3, 4), (5, 4), (4, 3), (4, 5)}

    def test_due_colpi_in_linea_prosegue_sulla_linea(self):
        # colonna: (4,4) e (5,4) colpiti -> deve continuare in (3,4) o (6,4)
        shots = [shot(4, 4, hit=True), shot(5, 4, hit=True)]
        result = bot_next_shot(shots)
        assert (result['x'], result['y']) in {(3, 4), (6, 4)}

    def test_linea_prosegue_dal_lato_ancora_libero(self):
        # un capo della linea è già stato sparato a vuoto: resta l'altro
        shots = [shot(4, 4, hit=True), shot(5, 4, hit=True), shot(3, 4)]
        result = bot_next_shot(shots)
        assert (result['x'], result['y']) == (6, 4)

    def test_non_esce_dalla_griglia(self):
        shots = [shot(0, 0, hit=True)]
        result = bot_next_shot(shots)
        assert (result['x'], result['y']) in {(1, 0), (0, 1)}

    def test_ignora_le_navi_gia_affondate(self):
        # l'unico colpo a segno appartiene a una nave affondata: niente caccia,
        # quindi torna in modalità ricerca sulla scacchiera
        shots = [shot(4, 4, hit=True)]
        sunk = [{'x': 4, 'y': 4}]
        result = bot_next_shot(shots, sunk_cells=sunk, rng=random.Random(1))
        assert (result['x'], result['y']) not in {(3, 4), (5, 4), (4, 3), (4, 5)}
        assert (result['x'] + result['y']) % 2 == 0
