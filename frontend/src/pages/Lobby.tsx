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
  const [gameOver, setGameOver] = useState(false);
  const [youWon, setYouWon] = useState(false);

  const setupWebSocket = useCallback((roomName: string, token: string) => {
    const socket = new WebSocket(`ws://localhost:8000/ws/lobby/${roomName}/${token}/`);

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
          if (data.lobby_phase === 'game' || data.lobby_phase === 'finished') {
            setIsPlayerTurn(data.your_turn);
            setYourShips(data.your_ships || []);
            setShotsFired(data.shots_fired || []);
            setShotsReceived(data.shots_received || []);
            setGameOver(data.game_over);
            setYouWon(data.you_won);
          }
          break;

        case 'phase_change':
          setPhase(data.phase);
          break;

        case 'game_started':
          setIsPlayerTurn(data.your_turn);
          setYourShips(data.your_ships || []);
          setShotsFired(data.shots_fired || []);
          setShotsReceived(data.shots_received || []);
          setGameOver(false);
          setYouWon(false);
          break;

        case 'shot_result': {
          const shot = { x: data.x, y: data.y, hit: data.hit };
          if (data.by_you) {
            setShotsFired(prev => [...prev, shot]);
          } else {
            setShotsReceived(prev => [...prev, shot]);
          }
          setIsPlayerTurn(data.your_turn);
          if (data.game_over) {
            setGameOver(true);
            setYouWon(data.you_won);
            setPhase('finished');
          }
          break;
        }

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

  const handleCellClick = (x: number, y: number) => {
    if (ws && isPlayerTurn && !gameOver) {
      ws.send(JSON.stringify({ type: 'shot', x, y }));
    }
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
    case 'finished':
      return (
        <div className='lobby-container'>
          <Game
            yourShips={yourShips}
            isPlayerTurn={isPlayerTurn}
            shotsFired={shotsFired}
            shotsReceived={shotsReceived}
            handleCellClick={handleCellClick}
            gameOver={gameOver}
            youWon={youWon}
          />
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
