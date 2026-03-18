import React from 'react';

export default function CategoryCard({ category, userPick, isLocked, onPick }) {
  const { nominees, correct_nominee_id } = category;
  const hasAnswer = correct_nominee_id != null;

  const handleRandom = (e) => {
    e.stopPropagation();
    if (isLocked || !nominees.length) return;
    const unpicked = nominees.filter(n => n.id !== userPick?.nominee_id);
    const pool = unpicked.length > 0 ? unpicked : nominees;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onPick(category.id, pick.id);
  };

  const getStatus = (nomineeId) => {
    if (!userPick || userPick.nominee_id !== nomineeId) return 'none';
    if (!hasAnswer) return 'pending';
    return nomineeId === correct_nominee_id ? 'correct' : 'wrong';
  };

  const statusColors = {
    none:    { bg: 'var(--surface2)',              border: 'var(--border)',               text: 'var(--text-dim)' },
    pending: { bg: 'rgba(136,146,170,0.1)',         border: 'rgba(136,146,170,0.4)',        text: 'var(--text)' },
    correct: { bg: 'rgba(34,201,122,0.12)',         border: 'rgba(34,201,122,0.5)',         text: 'var(--green)' },
    wrong:   { bg: 'rgba(232,66,66,0.1)',           border: 'rgba(232,66,66,0.4)',          text: 'var(--red)' },
  };

  return (
    <div className="card fade-in" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.2 }}>
          {category.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isLocked && (
            <button
              onClick={handleRandom}
              title="Pick randomly"
              style={{
                background: 'var(--surface3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: 15,
                lineHeight: 1,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--blue)';
                e.currentTarget.style.borderColor = 'var(--blue-dim)';
                e.currentTarget.style.background = 'var(--blue-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface3)';
              }}
            >
              🎲
            </button>
          )}
          {userPick && (
            <span style={{ fontSize: 18 }}>
              {!hasAnswer ? '⚪' : userPick.nominee_id === correct_nominee_id ? '✅' : '❌'}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {nominees.map((nominee) => {
          const status = getStatus(nominee.id);
          const colors = statusColors[status];
          const isSelected = userPick?.nominee_id === nominee.id;
          const isWinner = hasAnswer && nominee.id === correct_nominee_id;

          return (
            <div
              key={nominee.id}
              onClick={() => !isLocked && onPick(category.id, nominee.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                borderRadius: 'var(--radius)',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                cursor: isLocked ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isLocked && !isSelected) {
                  e.currentTarget.style.borderColor = 'var(--blue-dim)';
                  e.currentTarget.style.background = 'var(--blue-glow)';
                }
              }}
              onMouseLeave={e => {
                if (!isLocked && !isSelected) {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.background = colors.bg;
                }
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${isSelected ? colors.border : 'var(--border-bright)'}`,
                background: isSelected ? colors.border : 'transparent',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: isSelected || isWinner ? 600 : 400, fontSize: 14 }}>
                  {nominee.name}
                </div>
                {nominee.subtitle && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                    {nominee.subtitle}
                  </div>
                )}
              </div>
              {isWinner && (
                <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>★ WINNER</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
