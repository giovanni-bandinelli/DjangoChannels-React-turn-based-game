import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@mui/material';
import './Waiting.css';

const Waiting: React.FC = () => {
  const url = window.location.href;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        // navigator.clipboard only exists in a secure context: over plain http
        // on a LAN address (192.168.x.x) it is undefined, so fall back to the
        // old selection trick, which still works everywhere
        const field = document.createElement('textarea');
        field.value = url;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        document.body.removeChild(field);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="waiting-container">
      <p className="waiting-title">Waiting for the other player to join...</p>
      <p className="waiting-hint">Send them this link, or let them scan the code.</p>

      <div className="waiting-link">
        <input value={url} readOnly onFocus={(e) => e.target.select()} />
        <Button variant="contained" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div className="waiting-qr">
        <QRCodeSVG value={url} size={180} marginSize={2} />
      </div>
    </div>
  );
};

export default Waiting;
