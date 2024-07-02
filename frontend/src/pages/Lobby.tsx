// Lobby.tsx
import './Lobby.css';
import React, { useEffect, useState } from 'react';
import ChatLog from '../components/ChatLog';

const Lobby: React.FC = () => {
  const [messages, setMessages] = useState<{ message: string, username: string }[]>([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const roomName = new URLSearchParams(window.location.search).get('room');
    const token = localStorage.getItem('accessToken');
    if (roomName && token) {
      const socket = new WebSocket(`ws://192.168.1.125:8000/ws/lobby/${roomName}/${token}/`);
      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, { message: data.message, username: data.username }]);
      };
      setWs(socket);

      return () => {
        socket.close();
      };
    }
  }, []);

  const sendMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (ws && message && e.key === 'Enter') {
      const username = localStorage.getItem('username');
      ws.send(JSON.stringify({ 'type': 'chat_message', 'message': message, 'username': username }));
      setMessage('');
    }
  };

  return (
    <div id="RoomActivityContainer">
      <ChatLog
        messages={messages}
        message={message}
        setMessage={setMessage}
        sendMessage={sendMessage}
      />
    </div>
  );
};

export default Lobby;
