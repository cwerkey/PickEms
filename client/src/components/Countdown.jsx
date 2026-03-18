import React, { useState, useEffect } from 'react';

export default function Countdown({ lockTime, isLocked }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!lockTime || isLocked) return;

    const calc = () => {
      const diff = new Date(lockTime) - new Date();
      if (diff <= 0) return setTimeLeft(null);
      setTimeLeft(diff);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [lockTime, isLocked]);

  if (isLocked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px',
        background: 'rgba(232,66,66,0.1)',
        border: '1px solid rgba(232,66,66,0.3)',
        borderRadius: 'var(--radius)',
        color: 'var(--red)',
        fontSize: 13, fontWeight: 600,
      }}>
        🔒 PICKS LOCKED
      </div>
    );
  }

  if (!timeLeft) return null;

  const hours = Math.floor(timeLeft / 3600000);
  const mins = Math.floor((timeLeft % 3600000) / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);

  const isUrgent = timeLeft < 3600000; // under 1 hour

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px',
      background: isUrgent ? 'rgba(232,97,42,0.1)' : 'var(--blue-glow)',
      border: `1px solid ${isUrgent ? 'rgba(232,97,42,0.4)' : 'rgba(74,158,255,0.3)'}`,
      borderRadius: 'var(--radius)',
      color: isUrgent ? 'var(--rust)' : 'var(--blue)',
      fontSize: 13,
    }}>
      <span>⏱</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>until lock</span>
    </div>
  );
}