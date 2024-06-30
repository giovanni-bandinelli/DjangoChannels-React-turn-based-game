import React, { useEffect, useState } from 'react';

const Lobby: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const roomName = new URLSearchParams(window.location.search).get('room');
    const token = localStorage.getItem('accessToken');
    if (roomName && token) {
      const socket = new WebSocket(`ws://127.0.0.1:8000/ws/lobby/${roomName}/${token}/`);
      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setMessages((prev) => [...prev, data.message]);
      };
      setWs(socket);

      return () => {
        socket.close();
      };
    }
  }, []);

  const sendMessage = () => {
    if (ws && message) {
      ws.send(JSON.stringify({ 'type': 'chat_message', 'message': message }));
      setMessage('');
    }
  };

  return (
    <div>
      <h1>Lobby</h1>
      
      <div>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Lobby;
