import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ChatLog from '../components/ChatLog';
import LoginDialog from '../components/LoginDialog';
import SetupGame from '../components/phases/SetupGame';
import Waiting from '../components/phases/Waiting';
import Game from '../components/phases/Game';
import './Lobby.css'

const Lobby: React.FC = () => {
  // whoever opens an invite link has never logged in on this device
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [messages, setMessages] = useState<{ message: string, username: string }[]>([]);
  const [message, setMessage] = useState('');
  const [ships, setShips] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const isWsOpen = useRef(false);

  const [phase, setPhase] = useState('');
  const [yourShips, setYourShips] = useState<any[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(false);
  const [shotsFired, setShotsFired] = useState<any[]>([]);
  const [shotsReceived, setShotsReceived] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [youWon, setYouWon] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [youReady, setYouReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [sunkMessage, setSunkMessage] = useState<string | null>(null);
  const [enemySunk, setEnemySunk] = useState<any[]>([]);

  const setupWebSocket = useCallback((roomName: string, token: string) => {
    // same host and port as the page: Vite forwards /ws to Django
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${scheme}://${window.location.host}/ws/lobby/${roomName}/${token}/`
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);

      switch (data.type) {
        case 'chat_message':
          setMessages(prev => [...prev, { message: data.message, username: data.username }]);
          break;

        case 'new_ships_setup':
          setShips(data.ships);
          break;

        case 'restore_game_history': {
          setPhase(data.lobby_phase);
          setMessages(data.chat_history || []);
          const restoredShips = data.your_ships || [];
          setShips(restoredShips);
          setYouReady(data.you_ready);
          setOpponentReady(data.opponent_ready);
          if (data.lobby_phase === 'game' || data.lobby_phase === 'finished') {
            setIsPlayerTurn(data.your_turn);
            setYourShips(restoredShips);
            setShotsFired(data.shots_fired || []);
            setShotsReceived(data.shots_received || []);
            setGameOver(data.game_over);
            setYouWon(data.you_won);
            setEnemySunk(data.enemy_sunk || []);
          } else if (restoredShips.length === 0) {
            // first time in this room: ask the server for a layout. Sent on the
            // socket itself, because the ws state variable is not set yet here.
            socket.send(JSON.stringify({ type: 'randomize_ships' }));
          }
          break;
        }

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

        case 'ready_state':
          setYouReady(data.you_ready);
          setOpponentReady(data.opponent_ready);
          break;

        case 'rematch_started':
          setShotsFired([]);
          setShotsReceived([]);
          setYourShips([]);
          setShips([]);
          setGameOver(false);
          setYouWon(false);
          setIsPlayerTurn(false);
          setYouReady(false);
          setOpponentReady(false);
          setSunkMessage(null);
          setEnemySunk([]);
          setPhase('setup');
          // the server wiped the old layout, ask for a fresh one
          socket.send(JSON.stringify({ type: 'randomize_ships' }));
          break;

        case 'shot_result': {
          const shot = { x: data.x, y: data.y, hit: data.hit };
          if (data.by_you) {
            setShotsFired(prev => [...prev, shot]);
          } else {
            setShotsReceived(prev => [...prev, shot]);
          }
          setIsPlayerTurn(data.your_turn);
          // stays on screen until the next shot, then makes way for it
          setSunkMessage(
            data.sunk_ship
              ? (data.by_you
                  ? `You sank their ${data.sunk_ship.type}!`
                  : `Your ${data.sunk_ship.type} was sunk!`)
              : null
          );
          if (data.sunk_ship && data.by_you) {
            setEnemySunk(prev => [...prev, data.sunk_ship]);
          }
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

      // custom codes sent by the consumer when it refuses the connection
      if (event.code === 4003) {
        setConnectionError('This room already has two players.');
      } else if (event.code === 4001 || event.code === 4002) {
        setConnectionError('Your guest session is not valid any more.');
      } else {
        // anything else means the link just dropped: a server restart, wifi,
        // a laptop going to sleep. Without this the buttons keep being there
        // and quietly do nothing, which looks like the app being broken.
        setConnectionLost(true);
      }
    };

    return socket;
  }, []);

  useEffect(() => {
    const roomName = new URLSearchParams(window.location.search).get('room');

    if (roomName && token && !isWsOpen.current) {
      console.log('Attempting to open WebSocket connection');
      setupWebSocket(roomName, token);
    }
  }, [setupWebSocket, token]);

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

  // no payload: the server already knows which ships it gave us
  const setAsReady = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'ready' }));
    }
  };

  const handleCellClick = (x: number, y: number) => {
    if (ws && isPlayerTurn && !gameOver) {
      ws.send(JSON.stringify({ type: 'shot', x, y }));
    }
  };

  const requestRematch = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'rematch' }));
    }
  };

  // leaving just navigates away: closing the page closes the socket, and the
  // other player is told through the usual disconnection message
  const leaveGame = () => {
    window.location.href = '/';
  };

  if (connectionError) {
    return (
      <div className='lobby-container'>
        <div className='connection-error'>
          <p>{connectionError}</p>
          <Button variant='contained' onClick={leaveGame}>Back to home</Button>
        </div>
      </div>
    );
  }

  // no guest identity on this device yet: ask for a name before anything else,
  // and send whoever refuses back to the home page
  if (!token) {
    return (
      <div className='lobby-container'>
        <LoginDialog
          open={true}
          onClose={() => { window.location.href = '/'; }}
          onLoginSuccess={(newToken) => setToken(newToken)}
        />
      </div>
    );
  }

  // only the phase-specific part changes: the chat and the way out are always
  // there, so they live outside the switch
  let phaseContent;
  switch (phase) {
    case 'setup':
      phaseContent = (
        <SetupGame
          ships={ships}
          randomizeShips={randomizeShips}
          setAsReady={setAsReady}
          youReady={youReady}
          opponentReady={opponentReady}
        />
      );
      break;
    case 'game':
    case 'finished':
      phaseContent = (
        <Game
          yourShips={yourShips}
          isPlayerTurn={isPlayerTurn}
          shotsFired={shotsFired}
          shotsReceived={shotsReceived}
          handleCellClick={handleCellClick}
          gameOver={gameOver}
          youWon={youWon}
          sunkMessage={sunkMessage}
          enemySunk={enemySunk}
          onRematch={requestRematch}
          onLeave={leaveGame}
        />
      );
      break;
    default:
      phaseContent = <Waiting />;
  }

  return (
    <div className='lobby-page'>
      {connectionLost && (
        <div className='connection-lost'>
          <span>Connection lost.</span>
          {/* reloading is enough: the server restores the whole game state */}
          <Button size='small' variant='contained' onClick={() => window.location.reload()}>
            Reconnect
          </Button>
        </div>
      )}
      <div className='lobby-topbar'>
        {/* color inherit: leaving is a way out, not the action we want to push */}
        <Button
          size='small'
          color='inherit'
          startIcon={<MeetingRoomIcon />}
          onClick={leaveGame}
        >
          Leave room
        </Button>
      </div>
      <div className='lobby-container'>
        {phaseContent}
        <ChatLog messages={messages} message={message} setMessage={setMessage} sendMessage={sendMessage} />
      </div>
    </div>
  );
};

export default Lobby;
