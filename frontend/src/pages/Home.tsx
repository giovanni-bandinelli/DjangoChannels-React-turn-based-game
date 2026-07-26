// src/pages/Home.tsx
import React, { useState } from 'react';
import { Button } from '@mui/material';
import LoginDialog from '../components/LoginDialog';
import { createRoom } from '../api/api';

const Home: React.FC = () => {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

  const createRoomAndEnter = async () => {
    try {
      const { room_name } = await createRoom();
      window.location.href = `/lobby?room=${room_name}`;
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const handlePlayButtonClick = () => {
    if (token) {
      createRoomAndEnter();
    } else {
      setIsLoginDialogOpen(true);
    }
  };

  const handleLoginSuccess = (newToken: string, newUsername: string) => {
    localStorage.setItem('accessToken', newToken);
    setToken(newToken);
    setUsername(newUsername);
    setIsLoginDialogOpen(false);
    // the token is already in localStorage, so the request is authenticated
    createRoomAndEnter();
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
    </div>
  );
};

export default Home;
