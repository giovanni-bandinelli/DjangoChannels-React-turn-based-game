import React, { useEffect, useState, useRef, useCallback } from 'react';
import ChatLog from '../components/ChatLog';
import SetupGame from '../components/phases/SetupGame';
import Waiting from '../components/phases/Waiting';
import Game from '../components/phases/Game';
import './Lobby.css'

const Lobby: React.FC = () => {
  const [messages, setMessages] = useState<{ message: string, username: string }[]>([]);
  const [message, setMessage] = useState('');
  const [ships, setShips] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const isWsOpen = useRef(false);
  const initialized = useRef(false);

  const [phase, setPhase] = useState('');
  const [yourShips, setYourShips] = useState<any[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(false);
  const [shotsFired, setShotsFired] = useState<any[]>([]);
  const [shotsReceived, setShotsReceived] = useState<any[]>([]);

  const setupWebSocket = useCallback((roomName: string, token: string) => {
    const socket = new WebSocket(`ws://192.168.1.125:8000/ws/lobby/${roomName}/${token}/`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);

      switch (data.type) {
        case 'chat_message':
          setMessages(prev => [...prev, { message: data.message, username: data.username }]);
          break;

        case 'new_ships_setup':
          setShips(data.ships);
          localStorage.setItem('ships', JSON.stringify(data.ships));
          break;

        case 'restore_game_history':
          setPhase(data.lobby_phase);
          setMessages(data.chat_history || []);
          if (data.lobby_phase === 'game') {
            setIsPlayerTurn(data.your_turn);
            setYourShips(data.your_ships);
            setShotsFired(data.shots_fired_history);
            setShotsReceived(data.shots_received_history);
          }
          break;

        case 'phase_change':
          setPhase(data.phase);
          break;

        case 'game_started':
          setIsPlayerTurn(data.your_turn);
          setYourShips(data.your_ships);
          setShotsFired(data.shots_fired_history);
          setShotsReceived(data.shots_received_history);
          break;

        case 'turn_changed':
          console.log('Turn changed:', data.current_turn);
          break;

        case 'shot_received':
          console.log('Shot received:', data);
          break;

        default:
          break;
      }
    };

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

    return socket;
  }, []);

  useEffect(() => {
    const roomName = new URLSearchParams(window.location.search).get('room');
    const token = localStorage.getItem('accessToken');

    if (roomName && token && !isWsOpen.current) {
      console.log('Attempting to open WebSocket connection');
      setupWebSocket(roomName, token);
    }
  }, [setupWebSocket]);

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

  const setAsReady = () => {
    if (ws) {
      const savedShips = localStorage.getItem('ships');
      let ships = [];
      if (savedShips) {
        try {
          ships = JSON.parse(savedShips);
        } catch (e) {
          console.error('Error parsing ships from localStorage:', e);
        }
      }
      ws.send(JSON.stringify({ type: 'ready', 'ships': ships }));
    }
  };

  const handleCellClick = (cellIndex: number, rowIndex: number) => {
    console.log(`Cell clicked at row ${rowIndex + 1}, col ${cellIndex + 1}`);
  };

  useEffect(() => {
    if (!initialized.current) {
      const savedShips = localStorage.getItem('ships');
      let parsedShips = null;
      if (savedShips) {
        try {
          parsedShips = JSON.parse(savedShips);
        } catch (e) {
          console.error('Error parsing savedShips from localStorage, click "randomize to get a new set of ships":', e);
        }
      }
      if (Array.isArray(parsedShips) && parsedShips.length > 0) {
        setShips(parsedShips);
      } else {
        randomizeShips();
      }
      initialized.current = true;
    }
  }, [ws]);

  switch (phase) {
    case 'setup':
      return (
        <div className='lobby-container'>
          <SetupGame ships={ships} randomizeShips={randomizeShips} setAsReady={setAsReady} />
          <ChatLog messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} />
        </div>
      );
    case 'game':
      return (
        <div className='lobby-container'>
          <Game yourShips={yourShips} isPlayerTurn={isPlayerTurn} shotsFired={shotsFired} shotsReceived={shotsReceived} handleCellClick={handleCellClick} />
          <ChatLog messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} />
        </div>
      );
    default:
      return (
        <div className='lobby-container'>
          <Waiting />
          <ChatLog messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} />
        </div>
      );
  }
};

export default Lobby;
