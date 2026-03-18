import React, { useState, useEffect } from 'react';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function AllTime() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllTimeStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading stats...</div>
    </div>
  );
  if (!data) return null;

  const { events, users, eventScores, eventWinners } = data;

  const scoreLookup = {};
  for (const s of eventScores) {
    if (!scoreLookup[s.user_id]) scoreLookup[s.user_id] = {};
    scoreLookup[s.user_id][s.event_id] = s.correct;
  }

  const totals = users.map(u => ({
    ...u,
    total: events.reduce((sum, e) => sum + (scoreLookup[u.id]?.[e.id] || 0), 0),
    eventsWon: events.filter(e => eventWinners[e.id] === u.id).length,
  })).sort((a, b) => b.total - a.total || b.eventsWon - a.eventsWon);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">ALL-TIME</h1>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>OVERALL STANDINGS</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {totals.slice(0, 3).map((user, idx) => (
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: idx === 0 ? 'var(--gold)' : 'var(--text)' }}>
                  {user.display_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {user.eventsWon} event{user.eventsWon !== 1 ? 's' : ''} won
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
                  color: idx === 0 ? 'var(--gold)' : 'var(--blue)',
                }}>{user.total}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>total pts</div>
              </div>
            </div>
          ))}
        </div>
        {totals.length > 3 && (
          <>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {totals.slice(3).map((user, idx) => (
                <div key={user.id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 12px', fontSize: 14, color: 'var(--text-dim)',
                }}>
                  <span style={{ color: 'var(--text-muted)', width: 28, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {idx + 4}
                  </span>
                  <span style={{ flex: 1 }}>{user.display_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>
                    {user.eventsWon}W
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>
                    {user.total}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>pts</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {events.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>EVENT BREAKDOWN</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 120 }}>User</th>
                  {events.map(e => (
                    <th key={e.id} style={{ ...thStyle, textAlign: 'center', minWidth: 100 }}>
                      <div>{e.name}</div>
                      {e.event_date && (
                        <div style={{ fontWeight: 400, fontSize: 10, marginTop: 2 }}>
                          {new Date(e.event_date).getFullYear()}
                        </div>
                      )}
                    </th>
                  ))}
                  <th style={{ ...thStyle, textAlign: 'center', color: 'var(--blue)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {totals.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>
                      {user.display_name}
                    </td>
                    {events.map(e => {
                      const pts = scoreLookup[user.id]?.[e.id];
                      const isWinner = eventWinners[e.id] === user.id;
                      return (
                        <td key={e.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {pts != null ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: isWinner ? 700 : 400,
                              color: isWinner ? 'var(--gold)' : 'var(--text-dim)',
                            }}>
                              {pts}{isWinner ? ' 🏆' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>
                      {user.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No completed events yet.
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '8px 12px', color: 'var(--text-muted)',
  fontWeight: 500, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
