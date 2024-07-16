import React, { useEffect, useState, useMemo } from 'react';
import '../BattleShipGame.css';

interface GameProps {
  yourShips: Ship[];
  isPlayerTurn: boolean;
  handleCellClick: (cellIndex: number, rowIndex: number) => void;
  shotsFired: { x: number; y: number }[];
  shotsReceived: { x: number; y: number }[];
}

interface Ship {
  type: string;
  size: number;
  coordinates: { x: number; y: number }[];
}

const Game: React.FC<GameProps> = ({
  yourShips,
  isPlayerTurn,
  handleCellClick,
  shotsFired = [],
  shotsReceived = []
}) => {
  const initialBoard = useMemo(() => Array.from({ length: 10 }, () => Array(10).fill(null)), []);
  const [boardState, setBoardState] = useState({
    yourBoard: initialBoard,
    enemyBoard: initialBoard
  });

  useEffect(() => {
    const updateBoardWithShips = () => {
      const newBoard = initialBoard.map(row => [...row]);
      yourShips.forEach(ship => {
        ship.coordinates.forEach(coord => {
          newBoard[coord.x][coord.y] = ship.type;
        });
      });
      setBoardState(prevState => ({ ...prevState, yourBoard: newBoard }));
    };

    updateBoardWithShips();
  }, [yourShips]);

 /**DIO CANE DIO CANE DIO CANE, TENTATIVO DI EVENTUALMENTE CARICARE I COLPI SPARATI DA ENTRAMBI CAUSA RE-RENDERING INFINITO
  * (MANCA TUTTA LA LOGICA ALSO MA SAREBBE SOLTANTO UN "MANDA COORDINATE CELLA AVVERSARIA PREMUTA (SE NON È
  * GIÀ STATA CLICCATA ONCE E SE È IL TUO TURNO") RICEVI HIT/MISS  > SOMEWHERE NEL CONSUMER/MODELS.PY TIENI TRACCIA DI QUANDO UNA NAVE È STATA AFFONDATA E EVENTUALMENTE MANDI MESSAGGIO GAME_ENDED
  * 
   useEffect(() => {
    const updatePlayerBoardWithShots = () => {
      setBoardState(prevState => {
        const newBoard = prevState.yourBoard.map(row => [...row]);
        shotsReceived.forEach(shot => {
          if (newBoard[shot.x][shot.y] !== 'cell-fired') {
            newBoard[shot.x][shot.y] = 'cell-fired';
          }
        });
        return { ...prevState, yourBoard: newBoard };
      });
    };

    updatePlayerBoardWithShots();
  }, [shotsReceived]);

  useEffect(() => {
    const updateEnemyBoardWithShots = () => {
      setBoardState(prevState => {
        const newBoard = prevState.enemyBoard.map(row => [...row]);
        shotsFired.forEach(shot => {
          if (newBoard[shot.x][shot.y] !== 'cell-fired') {
            newBoard[shot.x][shot.y] = 'cell-fired';
          }
        });
        return { ...prevState, enemyBoard: newBoard };
      });
    };

    updateEnemyBoardWithShots();
  }, [shotsFired]);

  */
  const getShipCellClass = (cellContent: string | null) => {
    if (!cellContent) return '';
    if (cellContent === 'hit') return 'hit-cell';
    if (cellContent === 'cell-fired') return 'cell-fired';
    return `${cellContent.toLowerCase()}-cell ship-cell`;
  };

  return (
    <div id="battleship-game-container">
      <div id="game-info">
        <p>{isPlayerTurn ? "Your turn to fire!" : "Enemy's turn to fire!"}</p>
      </div>
      <div id="gameboards-container">
        <div className="game-board-container">
          <h3>Your Board</h3>
          <div className="player-board game-board">
            {boardState.yourBoard.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="cell">
                    {cell && <div className={getShipCellClass(cell)}></div>}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="game-board-container">
          <h3>Enemy's Board</h3>
          <div className="enemy-board game-board">
            {boardState.enemyBoard.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <div
                    key={cellIndex}
                    className="cell"
                    onClick={() => isPlayerTurn && handleCellClick(cellIndex, rowIndex)}
                  >
                    {cell && <div className={getShipCellClass(cell)}></div>}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
