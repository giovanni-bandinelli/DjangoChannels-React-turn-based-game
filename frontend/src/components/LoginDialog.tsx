// src/components/LoginDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import { guestLogin } from '../api/api';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, username: string) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    try {
      const token = await guestLogin(username);
      onLoginSuccess(token,username);
      onClose();
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleLogin} variant="contained">Login</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginDialog;
