import './ChatLog.css';
//import CloseIcon from '@mui/icons-material/Close'; <span id="CloseChatLogBtn"><CloseIcon /></span>
import React from 'react';

interface ChatLogProps {
  messages: { message: string, username: string }[];
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => void; 
}

const ChatLog: React.FC<ChatLogProps> = ({ messages, message, setMessage, sendMessage }) => {
  
  return (
    <div id="RoomActivityContainer">
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
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
      </div>
    </div>
  );
};

export default ChatLog;
