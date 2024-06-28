import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { createRoom } from '../api/api';

interface GameSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateRoomSuccess: (roomName: string) => void;
}

const GameSetupDialog: React.FC<GameSetupDialogProps> = ({ open, onClose, onCreateRoomSuccess }) => {
  const [timePerTurn, setTimePerTurn] = useState<number>(1); 
  const [minutesPerPlayer, setMinutesPerPlayer] = useState<number>(2); 
  const [whoPlaysFirst, setWhoPlaysFirst] = useState<string>('Me'); 

  const handleCreateRoom = async () => {
    try {
      const roomSettings = {
        time_per_turn: timePerTurn,
        minutes_per_player: minutesPerPlayer,
        who_plays_first: whoPlaysFirst
      };
  
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('JWT token not found in localStorage.');
      }
  
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
  
      const response = await createRoom(roomSettings, headers);
  
      const roomName = response.room_name; // Access room_name from the response data
      onCreateRoomSuccess(roomName);
      onClose();
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    }
  };
  

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Game Room</DialogTitle>
      <DialogContent>
        <FormControl fullWidth>
          <InputLabel htmlFor="time-per-turn">Time per Turn (minutes)</InputLabel>
          <Select
            value={timePerTurn}
            onChange={(e) => setTimePerTurn(Number(e.target.value))}
            inputProps={{
              name: 'timePerTurn',
              id: 'time-per-turn',
            }}
          >
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel htmlFor="minutes-per-player">Minutes per Player (seconds)</InputLabel>
          <Select
            value={minutesPerPlayer}
            onChange={(e) => setMinutesPerPlayer(Number(e.target.value))}
            inputProps={{
              name: 'minutesPerPlayer',
              id: 'minutes-per-player',
            }}
          >
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
    
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel htmlFor="who-plays-first">Who plays First?</InputLabel>
          <Select
            value={whoPlaysFirst}
            onChange={(e) => setWhoPlaysFirst(e.target.value as string)}
            inputProps={{
              name: 'whoPlaysFirst',
              id: 'who-plays-first',
            }}
          >
            <MenuItem value="Me">Me</MenuItem>
            <MenuItem value="Opponent">Opponent</MenuItem>
            <MenuItem value="Random">Random</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreateRoom} variant="contained">Create</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameSetupDialog;
