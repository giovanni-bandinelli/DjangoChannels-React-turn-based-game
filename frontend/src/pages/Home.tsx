// src/pages/Home.tsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import LoginDialog from '../components/LoginDialog';
import { createRoom } from '../api/api';

const Home: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

  // remembered while the login dialog is open, so that after signing in we
  // create the kind of room the user actually asked for
  const [pendingVsBot, setPendingVsBot] = useState(false);

  const createRoomAndEnter = async (vsBot: boolean) => {
    try {
      const { room_name } = await createRoom(vsBot);
      window.location.href = `/lobby?room=${room_name}`;
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const startGame = (vsBot: boolean) => {
    if (token) {
      createRoomAndEnter(vsBot);
    } else {
      setPendingVsBot(vsBot);
      setIsLoginDialogOpen(true);
    }
  };

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    localStorage.setItem('accessToken', newToken);
    setToken(newToken);
    setUsername(newUsername);
    setIsLoginDialogOpen(false);
    // the token is already in localStorage, so the request is authenticated
    createRoomAndEnter(pendingVsBot);
  };

  return (
    <div>
      <h1>Battaglia Navale :)</h1>
      <div className="home-actions">
        <Button variant="contained" onClick={() => startGame(false)}>
          Play with a Friend
        </Button>
        <Button variant="outlined" onClick={() => startGame(true)}>
          Play vs the Computer
        </Button>
      </div>
      {username ? (
        <div>Currently logged in as guest user: <b>{username}</b></div>
      ) : (
        <div>Currently not logged in.</div>
      )}
      <LoginDialog open={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};

export default Home;
