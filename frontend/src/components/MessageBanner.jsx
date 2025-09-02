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

  const color = message.type === 'error' ? '#dc2626' : message.type === 'success' ? '#16a34a' : message.type === 'warning' ? '#ca8a04' : '#2563eb';

  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', top: 12, right: 12, background: 'white', border: `1px solid ${color}`, color, padding: '10px 12px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      {message.text}
      <button onClick={() => onClose?.()} style={{ marginLeft: 12, background: 'transparent', border: 0, color, cursor: 'pointer' }}>×</button>
    </div>
  );
};

export default MessageBanner;
