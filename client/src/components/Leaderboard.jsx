import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ eventId, refresh }) {
  const [data, setData] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // { user, picks }
  const [loadingUser, setLoadingUser] = useState(false);
  const [activityBanner, setActivityBanner] = useState(null);
  const prevRecentRef = useRef(null);

  useEffect(() => {
    api.getLeaderboard(eventId)
      .then(d => {
        setData(d);
        // Show banner if recentActivity changed since last poll
        if (d.recentActivity) {
          const key = d.recentActivity.category_name;
          if (prevRecentRef.current !== key) {
            if (prevRecentRef.current !== null) {
              setActivityBanner(d.recentActivity);
              setTimeout(() => setActivityBanner(null), 12000);
            }
            prevRecentRef.current = key;
          }
        }
      })
      .catch(console.error);
  }, [eventId, refresh]);

  const handleViewUser = async (userId) => {
    if (!data?.isLocked) return;
    setLoadingUser(true);
    try {
      const result = await api.getUserPicks(eventId, userId);
      setViewingUser(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  if (!data) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
      Loading...
    </div>
  );

  const { scores, totalCategories, isLocked, recentActivity } = data;
  const hasAnyPicks = scores.some(s => s.total_picks > 0);

  if (!hasAnyPicks) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
      No picks submitted yet
    </div>
  );

  const withPicks = scores.filter(s => s.total_picks > 0);
  const top3 = withPicks.slice(0, 3);
  const rest = withPicks.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Recent Answer Activity Banner */}
      {activityBanner && (
        <div className="fade-in" style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border-bright)',
          borderLeft: '3px solid var(--rust)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--rust)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                🏆 Winner Announced
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                {activityBanner.category_name}: <span style={{ color: 'var(--gold)' }}>{activityBanner.winner_name}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activityBanner.picks.map(p => (
                  <span key={p.display_name} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: p.correct ? 'rgba(34,201,122,0.12)' : 'rgba(232,66,66,0.1)',
                    border: `1px solid ${p.correct ? 'rgba(34,201,122,0.4)' : 'rgba(232,66,66,0.3)'}`,
                    color: p.correct ? 'var(--green)' : 'var(--red)',
                  }}>
                    {p.correct ? '✓' : '✗'} {p.display_name}
                    {!p.correct && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({p.picked_name})</span>}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setActivityBanner(null)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 16, marginLeft: 12,
            }}>✕</button>
          </div>
        </div>
      )}

      {/* Most Recent Answer — always visible when locked */}
      {isLocked && recentActivity && !activityBanner && (
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--border-bright)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Most Recent Answer
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8, fontSize: 14 }}>
            {recentActivity.category_name}: <span style={{ color: 'var(--gold)' }}>{recentActivity.winner_name}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {recentActivity.picks.map(p => (
              <span key={p.display_name} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: p.correct ? 'rgba(34,201,122,0.12)' : 'rgba(232,66,66,0.1)',
                border: `1px solid ${p.correct ? 'rgba(34,201,122,0.4)' : 'rgba(232,66,66,0.3)'}`,
                color: p.correct ? 'var(--green)' : 'var(--red)',
              }}>
                {p.correct ? '✓' : '✗'} {p.display_name}
                {!p.correct && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({p.picked_name})</span>}
              </span>
            ))}
          </div>
        </div>
      )}

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
              background: idx === 0 ? 'linear-gradient(135deg, rgba(245,200,66,0.1), rgba(232,97,42,0.05))' : 'var(--surface2)',
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
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {user.answered_categories} answered</div>
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

      {/* Pick Status Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
            {isLocked ? 'FULL SCORES' : 'PICK STATUS'}
          </h3>
          {isLocked && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Click a name to view their picks
            </span>
          )}
        </div>
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
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      opacity: none ? 0.5 : 1,
                      cursor: isLocked ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => isLocked && handleViewUser(user.id)}
                    onMouseEnter={e => { if (isLocked) e.currentTarget.style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                      <span style={{ color: isLocked ? 'var(--blue)' : 'var(--text)' }}>
                        {user.display_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontWeight: 600,
                          color: allIn ? 'var(--green)' : none ? 'var(--red)' : 'var(--rust)',
                        }}>
                          {user.total_picks} / {totalCategories}
                        </span>
                        <div style={{ width: 80, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
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

      {/* User Picks Modal */}
      {(viewingUser || loadingUser) && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={e => e.target === e.currentTarget && setViewingUser(null)}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            {loadingUser ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading picks...</div>
            ) : viewingUser && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: '1.5rem' }}>{viewingUser.user.display_name}</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setViewingUser(null)}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {viewingUser.picks.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
                      No picks submitted
                    </div>
                  )}
                  {viewingUser.picks.map(pick => {
                    const hasAnswer = pick.correct_nominee_id != null;
                    const isCorrect = pick.nominee_id === pick.correct_nominee_id;
                    const statusColor = !hasAnswer
                      ? 'var(--text-muted)'
                      : isCorrect ? 'var(--green)' : 'var(--red)';
                    const statusBg = !hasAnswer
                      ? 'var(--surface2)'
                      : isCorrect ? 'rgba(34,201,122,0.08)' : 'rgba(232,66,66,0.08)';
                    const statusBorder = !hasAnswer
                      ? 'var(--border)'
                      : isCorrect ? 'rgba(34,201,122,0.3)' : 'rgba(232,66,66,0.3)';
                    return (
                      <div key={pick.category_id} style={{
                        padding: '10px 14px',
                        background: statusBg,
                        border: `1px solid ${statusBorder}`,
                        borderRadius: 'var(--radius)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                            {pick.category_name}
                          </div>
                          <div style={{ fontWeight: 600, color: statusColor }}>
                            {pick.nominee_name}
                          </div>
                        </div>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>
                          {!hasAnswer ? '⚪' : isCorrect ? '✅' : '❌'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '8px 12px',
  color: 'var(--text-muted)', fontWeight: 500,
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em',
};
