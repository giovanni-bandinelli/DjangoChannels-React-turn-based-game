import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import DiceIcon from './DiceIcon';
import './BattleShipGame.css';

interface Ship {
  type: string;
  size: number;
  coordinates: { x: number; y: number }[];
}

interface BattleShipGameProps {
  ships: Ship[];
  setShips: React.Dispatch<React.SetStateAction<Ship[]>>;
  randomizeShips: () => void;
}

const BattleShipGame: React.FC<BattleShipGameProps> = ({ ships, setShips, randomizeShips }) => {
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

  const handleCellClick = (cellIndex: number, rowIndex: number) => {
    console.log(`Cell clicked at row ${rowIndex + 1}, col ${cellIndex + 1}`);
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
                <div key={cellIndex} className="cell" onClick={() => handleCellClick(cellIndex, rowIndex)}>
                  {cell && <div className={getShipCellClass(cell)}></div>}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className='setup-buttons-container'>
        <Button id="randomize-button" onClick={randomizeShips} variant="contained" startIcon={<DiceIcon />}>Randomize</Button>
        <Button id="start-button" onClick={() => console.log('Start Game')} variant="contained">Start Game</Button>
      </div>
    </div>
  );
};

export default BattleShipGame;
