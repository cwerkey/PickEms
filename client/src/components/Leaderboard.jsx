import React, { useState, useEffect } from 'react';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ eventId, refresh }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    api.getLeaderboard(eventId)
      .then(setScores)
      .catch(console.error);
  }, [eventId, refresh]);

  if (!scores.length) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
      No picks submitted yet
    </div>
  );

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span className="live-dot" />
        <h3 style={{ fontSize: '1.3rem', color: 'var(--text)' }}>LEADERBOARD</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: rest.length ? 16 : 0 }}>
        {top3.map((user, idx) => (
          <div key={user.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: idx === 0 ? 'linear-gradient(135deg, rgba(245,200,66,0.1), rgba(232,97,42,0.05))' : 'var(--surface2)',
            border: `1px solid ${idx === 0 ? 'rgba(245,200,66,0.3)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
          }}>
            <span style={{ fontSize: 22, width: 32 }}>{MEDALS[idx]}</span>
            <span style={{
              flex: 1,
              fontWeight: 600,
              color: idx === 0 ? 'var(--gold)' : 'var(--text)',
            }}>{user.display_name}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                fontWeight: 600,
                color: idx === 0 ? 'var(--gold)' : 'var(--blue)',
              }}>{user.correct}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                / {user.answered_categories} answered
              </div>
            </div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rest.map((user, idx) => (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '8px 12px',
                color: 'var(--text-dim)',
                fontSize: 14,
              }}>
                <span style={{ color: 'var(--text-muted)', width: 28, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {idx + 4}
                </span>
                <span style={{ flex: 1 }}>{user.display_name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>
                  {user.correct}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>pts</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}