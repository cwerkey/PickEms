import React, { useState, useEffect } from 'react';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ eventId, refresh }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getLeaderboard(eventId)
      .then(setData)
      .catch(console.error);
  }, [eventId, refresh]);

  if (!data) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
      Loading...
    </div>
  );

  const { scores, totalCategories, isLocked } = data;
  const hasAnyPicks = scores.some(s => s.total_picks > 0);

  if (!hasAnyPicks) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
      No picks submitted yet
    </div>
  );

  const withPicks = scores.filter(s => s.total_picks > 0);
  const top3 = withPicks.slice(0, 3);
  const rest = withPicks.slice(3);
  const noPicks = scores.filter(s => s.total_picks === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top 3 Podium */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span className="live-dot" />
          <h3 style={{ fontSize: '1.3rem', color: 'var(--text)' }}>LEADERBOARD</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top3.map((user, idx) => (
            <div key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              background: idx === 0
                ? 'linear-gradient(135deg, rgba(245,200,66,0.1), rgba(232,97,42,0.05))'
                : 'var(--surface2)',
              border: `1px solid ${idx === 0 ? 'rgba(245,200,66,0.3)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
            }}>
              <span style={{ fontSize: 22, width: 32 }}>{MEDALS[idx]}</span>
              <span style={{ flex: 1, fontWeight: 600, color: idx === 0 ? 'var(--gold)' : 'var(--text)' }}>
                {user.display_name}
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600,
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
            <div className="divider" style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rest.map((user, idx) => (
                <div key={user.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 12px', color: 'var(--text-dim)', fontSize: 14,
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

      {/* Full Picks Status Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: 16, color: 'var(--text)' }}>
          {isLocked ? 'FULL SCORES' : 'PICK STATUS'}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>User</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Picks Made</th>
                {isLocked && (
                  <>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Correct</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {scores.map((user) => {
                const pickPct = totalCategories > 0 ? (user.total_picks / totalCategories) * 100 : 0;
                const allIn = user.total_picks >= totalCategories;
                const none = user.total_picks === 0;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', opacity: none ? 0.5 : 1 }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>
                      {user.display_name}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 600,
                          color: allIn ? 'var(--green)' : none ? 'var(--red)' : 'var(--rust)',
                        }}>
                          {user.total_picks} / {totalCategories}
                        </span>
                        <div style={{
                          width: 80, height: 4, background: 'var(--surface3)',
                          borderRadius: 2, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${pickPct}%`,
                            background: allIn ? 'var(--green)' : 'var(--rust)',
                            borderRadius: 2, transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    </td>
                    {isLocked && (
                      <>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                          {user.correct}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)', fontSize: 16 }}>
                            {user.answered_categories > 0
                              ? `${Math.round((user.correct / user.answered_categories) * 100)}%`
                              : '—'}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '8px 12px',
  color: 'var(--text-muted)', fontWeight: 500,
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em',
};
