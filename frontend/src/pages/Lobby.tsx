import './Lobby.css';
import React, { useEffect, useState, useRef } from 'react';
import ChatLog from '../components/ChatLog';
import BattleShipGame from '../components/BattleShipGame';

const Lobby: React.FC = () => {
  const [messages, setMessages] = useState<{ message: string, username: string }[]>([]);
  const [message, setMessage] = useState('');
  const [ships, setShips] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const isWsOpen = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    const roomName = new URLSearchParams(window.location.search).get('room');
    const token = localStorage.getItem('accessToken');

    if (roomName && token && !isWsOpen.current) {
      console.log('Attempting to open WebSocket connection');
      const socket = new WebSocket(`ws://192.168.1.125:8000/ws/lobby/${roomName}/${token}/`);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data); 

        if (data.type === 'chat_message') {

          setMessages((prev) => {
            const newMessages = [...prev, { message: data.message, username: data.username }];
            return newMessages;
          });
        } 
        else if (data.type === 'setup') {

          setShips(data.ships);
          localStorage.setItem('ships', JSON.stringify(data.ships));
        }
      }
      socket.onopen = () => {
        setWs(socket);
        isWsOpen.current = true;
        console.log('WebSocket connection established');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setWs(null);
        isWsOpen.current = false;
      };

      return () => {
        console.log('Cleaning up WebSocket connection');
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
          console.log('WebSocket connection closed by cleanup');
        }
      };
    }
  }, []);

  const sendMessage = () => {
    if (ws && message) {
      console.log('Sending message:', message);
      const username = localStorage.getItem('username');
      ws.send(JSON.stringify({ 'type': 'chat_message', 'message': message, 'username': username }));
      setMessage(''); 
    }
  };

  const randomizeShips = () => {
    if (ws) {
      ws.send(JSON.stringify({ 'type': 'randomize_ships' }));
    }
  };

  useEffect(() => {
    if (!initialized.current) {
      const savedShips = localStorage.getItem('ships');
      if (savedShips) {
        setShips(JSON.parse(savedShips));
      } else {
        randomizeShips();
      }
      initialized.current = true;
    }
  }, [ws]);

  return (
    <div className='lobby-container'>
      <BattleShipGame ships={ships} setShips={setShips} randomizeShips={randomizeShips} />
      <ChatLog messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} />
    </div>
  );
};

export default Lobby;
