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
      // closing is up to the parent: on the lobby page, cancelling and
      // succeeding have to lead to two different places
      onLoginSuccess(token, username);
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Login</DialogTitle>
      <DialogContent>
        {/* margin="normal": DialogContent drops its top padding when it follows
            a DialogTitle, so a field placed first has the shrunk label sitting
            outside the content box, where overflow-y: auto clips it.
            See mui/material-ui#31185 */}
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          margin="normal"
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
