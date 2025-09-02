import React, { useEffect, useRef } from 'react';

const MessageBanner = ({ message, onClose }) => {
  const timerRef = useRef(null);
  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { if (typeof onClose === 'function') onClose(); }, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; };
  }, [message, onClose]);

  if (!message) return null;

  const typeClass = `sketch-message-${message.type}`;

  return (
    <div role="status" aria-live="polite" className={`sketch-message ${typeClass}`}>
      {message.text}
      <button 
        onClick={() => onClose?.()} 
        style={{ 
          marginLeft: 12, 
          background: 'transparent', 
          border: 0, 
          color: 'inherit', 
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default MessageBanner;
