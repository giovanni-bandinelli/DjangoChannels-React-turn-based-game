// src/pages/Home.tsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import LoginDialog from '../components/LoginDialog';
import GameSetupDialog from '../components/GameSetupDialog';

const Home: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isGameSetupDialogOpen, setIsGameSetupDialogOpen] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

  const handlePlayButtonClick = () => {
    if (token) {
      setIsGameSetupDialogOpen(true);
    } else {
      setIsLoginDialogOpen(true);
    }
  };

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    localStorage.setItem('accessToken', newToken);
    setToken(newToken);
    setUsername(newUsername);
    
  };

  const handleCreateRoomSuccess = (roomName: string) => {
    window.location.href = `/lobby?room=${roomName}`;
  };

  return (
    <div>
      <h1>Battaglia Navale :)</h1>
      <Button variant="contained" onClick={handlePlayButtonClick}>
        Play with a Friend
      </Button>
      {username ? (
          <div>Currently logged in as guest user: <b>{username}</b></div>
        ) : (
          <div>Currently not logged in.</div>
        )}  
      <LoginDialog open={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} onLoginSuccess={handleLoginSuccess} />
      <GameSetupDialog open={isGameSetupDialogOpen} onClose={() => setIsGameSetupDialogOpen(false)} onCreateRoomSuccess={handleCreateRoomSuccess} />
    </div>
  );
};

export default Home;
