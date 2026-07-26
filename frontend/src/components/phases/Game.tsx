import React, { useMemo } from 'react';
import { Button } from '@mui/material';
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
  sunkMessage: string | null;
  enemySunk: Ship[];
  onRematch: () => void;
  onLeave: () => void;
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
  sunkMessage = null,
  enemySunk = [],
  onRematch,
  onLeave,
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

  // enemy ships you have finished off: their shape is no longer a secret
  const enemySunkCells = useMemo(() => {
    const cells = new Map<string, string>();
    enemySunk.forEach(ship =>
      ship.coordinates.forEach(coord =>
        cells.set(key(coord.x, coord.y), ship.type.toLowerCase())
      )
    );
    return cells;
  }, [enemySunk]);

  // one of yours counts as sunk when every cell of it has been shot at
  const yourSunkCells = useMemo(() => {
    const cells = new Set<string>();
    yourShips.forEach(ship => {
      const done = ship.coordinates.every(coord => received.has(key(coord.x, coord.y)));
      if (done) {
        ship.coordinates.forEach(coord => cells.add(key(coord.x, coord.y)));
      }
    });
    return cells;
  }, [yourShips, received]);

  const rows = Array.from({ length: BOARD_SIZE }, (_, x) => x);
  const cols = Array.from({ length: BOARD_SIZE }, (_, y) => y);

  const peg = (shot: Shot | undefined) =>
    shot ? <div className={shot.hit ? 'peg peg-hit' : 'peg peg-miss'} /> : null;

  return (
    <div id="battleship-game-container">
      <div id="game-info">
        {gameOver ? (
          <div className="end-menu">
            <p className={youWon ? 'result result-won' : 'result result-lost'}>
              {youWon ? 'You won!' : 'You lost.'}
            </p>
            <div className="end-menu-actions">
              <Button variant="contained" onClick={onRematch}>Rematch</Button>
              <Button variant="outlined" onClick={onLeave}>Back to home</Button>
            </div>
          </div>
        ) : (
          // the key changes with the turn, so React replaces the element and
          // the CSS animation runs again: that is what makes the switch visible
          <p
            key={String(isPlayerTurn)}
            className={isPlayerTurn ? 'turn turn-yours' : 'turn turn-theirs'}
          >
            {isPlayerTurn ? 'Your turn to fire!' : "Enemy's turn to fire!"}
          </p>
        )}
        {/* the slot is always there, empty or not: otherwise the boards jump
            up and down every time a ship goes under */}
        <div className="sunk-slot">
          {!gameOver && sunkMessage && (
            <p
              key={sunkMessage}
              className={`sunk-message ${
                sunkMessage.startsWith('You sank') ? 'sunk-theirs' : 'sunk-yours'
              }`}
            >
              {sunkMessage}
            </p>
          )}
        </div>
      </div>

      <div id="gameboards-container">
        <div className="game-board-container">
          <h3>Your Board</h3>
          <div className="player-board game-board">
            {rows.map(x =>
              cols.map(y => {
                const shipType = shipCells.get(key(x, y));
                const isSunk = yourSunkCells.has(key(x, y));
                return (
                  <div key={key(x, y)} className="cell">
                    {shipType && (
                      <div
                        className={`${shipType}-cell ship-cell ${isSunk ? 'ship-sunk' : ''}`}
                      />
                    )}
                    {peg(received.get(key(x, y)))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="game-board-container">
          <h3>Enemy's Board</h3>
          <div
            className={`enemy-board game-board ${
              isPlayerTurn && !gameOver ? 'board-active' : ''
            }`}
          >
            {rows.map(x =>
              cols.map(y => {
                const alreadyFired = fired.has(key(x, y));
                const canFire = isPlayerTurn && !gameOver && !alreadyFired;
                const sunkType = enemySunkCells.get(key(x, y));
                return (
                  <div
                    key={key(x, y)}
                    className={`cell ${canFire ? 'cell-targetable' : ''}`}
                    onClick={() => canFire && handleCellClick(x, y)}
                  >
                    {sunkType && <div className={`${sunkType}-cell sunk-reveal`} />}
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
