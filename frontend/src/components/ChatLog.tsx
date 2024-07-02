// ChatLog.tsx
import './ChatLog.css';
import React from 'react';

interface ChatLogProps {
  messages: { message: string, username: string }[];
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ChatLog: React.FC<ChatLogProps> = ({ messages, message, setMessage, sendMessage }) => {
  return (
    <div>
      <div id="RoomActivityTitle">
        <span>Room Activity</span>
      </div>
      <div id="RoomActivityMessages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <div className="msg-content">{msg.message}</div>
            <div className="msg-username-wrapper">
              <div>- </div>
              <div className="msg-username">{msg.username}</div>
            </div>
          </div>
        ))}
      </div>
      <div id="RoomActivityInput">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="send message"
          onKeyUp={sendMessage}
        />
      </div>
    </div>
  );
};

export default ChatLog;
