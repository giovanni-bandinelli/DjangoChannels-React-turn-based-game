import React, { useMemo } from 'react';
import '../BattleShipGame.css';

interface Shot {
  x: number;
  y: number;
  hit: boolean;
}

interface Ship {
  type: string;
  size: number;
  coordinates: { x: number; y: number }[];
}

interface GameProps {
  yourShips: Ship[];
  isPlayerTurn: boolean;
  handleCellClick: (x: number, y: number) => void;
  shotsFired: Shot[];
  shotsReceived: Shot[];
  gameOver: boolean;
  youWon: boolean;
}

const BOARD_SIZE = 10;
const key = (x: number, y: number) => `${x},${y}`;

const shotMap = (shots: Shot[]) =>
  new Map(shots.map(shot => [key(shot.x, shot.y), shot]));

const Game: React.FC<GameProps> = ({
  yourShips = [],
  isPlayerTurn,
  handleCellClick,
  shotsFired = [],
  shotsReceived = [],
  gameOver = false,
  youWon = false,
}) => {
  const shipCells = useMemo(() => {
    const cells = new Map<string, string>();
    yourShips.forEach(ship =>
      ship.coordinates.forEach(coord =>
        cells.set(key(coord.x, coord.y), ship.type.toLowerCase())
      )
    );
    return cells;
  }, [yourShips]);

  const received = useMemo(() => shotMap(shotsReceived), [shotsReceived]);
  const fired = useMemo(() => shotMap(shotsFired), [shotsFired]);

  const rows = Array.from({ length: BOARD_SIZE }, (_, x) => x);
  const cols = Array.from({ length: BOARD_SIZE }, (_, y) => y);

  const peg = (shot: Shot | undefined) =>
    shot ? <div className={shot.hit ? 'peg peg-hit' : 'peg peg-miss'} /> : null;

  return (
    <div id="battleship-game-container">
      <div id="game-info">
        {gameOver ? (
          <p className={youWon ? 'result result-won' : 'result result-lost'}>
            {youWon ? 'You won!' : 'You lost.'}
          </p>
        ) : (
          <p>{isPlayerTurn ? 'Your turn to fire!' : "Enemy's turn to fire!"}</p>
        )}
      </div>

      <div id="gameboards-container">
        <div className="game-board-container">
          <h3>Your Board</h3>
          <div className="player-board game-board">
            {rows.map(x =>
              cols.map(y => {
                const shipType = shipCells.get(key(x, y));
                return (
                  <div key={key(x, y)} className="cell">
                    {shipType && <div className={`${shipType}-cell ship-cell`} />}
                    {peg(received.get(key(x, y)))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="game-board-container">
          <h3>Enemy's Board</h3>
          <div className="enemy-board game-board">
            {rows.map(x =>
              cols.map(y => {
                const alreadyFired = fired.has(key(x, y));
                const canFire = isPlayerTurn && !gameOver && !alreadyFired;
                return (
                  <div
                    key={key(x, y)}
                    className={`cell ${canFire ? 'cell-targetable' : ''}`}
                    onClick={() => canFire && handleCellClick(x, y)}
                  >
                    {peg(fired.get(key(x, y)))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
