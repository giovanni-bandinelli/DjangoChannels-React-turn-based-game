// setup.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import DiceIcon from '../DiceIcon';
import '../BattleShipGame.css';

interface Ship {
  type: string;
  size: number;
  coordinates: { x: number; y: number }[];
}

interface SetupGameProps {
  ships: Ship[];
  randomizeShips: () => void;
  setAsReady: () => void;
}

const SetupGame: React.FC<SetupGameProps> = ({ ships, randomizeShips, setAsReady}) => {
  const initialBoard = Array.from({ length: 10 }, () => Array(10).fill(null));

  const [playerBoard, setPlayerBoard] = useState(initialBoard);
  

  useEffect(() => {
    updateBoardWithShips(ships);
  }, [ships]);

  const updateBoardWithShips = (ships: Ship[]) => {
    const newBoard = initialBoard.map(row => [...row]);
    ships.forEach(ship => {
      ship.coordinates.forEach(coord => {
        newBoard[coord.x][coord.y] = ship.type;
      });
    });
    setPlayerBoard(newBoard);
  };

  const getShipCellClass = (shipType: string | null) => {
    if (!shipType) return '';
    return `${shipType.toLowerCase()}-cell ship-cell`;
  };

  return (
    <div id="battleship-game-container">
      <div id="game-info">
        <p>Setup phase</p>
      </div>
      <div id="gameboards-container">
        <div className="game-board" id="player-board">
          {playerBoard.map((row, rowIndex) => (
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
      <div className='setup-buttons-container'>
        <Button id="randomize-button" onClick={randomizeShips} variant="contained" startIcon={<DiceIcon />}>Randomize</Button>
        <Button id="start-button" onClick={setAsReady} variant="contained">Ready</Button>
      </div>
    </div>
  );
};

export default SetupGame;
