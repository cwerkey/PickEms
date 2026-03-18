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

  const statusStyles = {
    none:    { bg: 'transparent',                  border: 'var(--border)',               color: 'var(--text-dim)',  selectedBg: 'var(--surface3)' },
    pending: { bg: 'rgba(74,158,255,0.12)',         border: 'rgba(74,158,255,0.5)',         color: 'var(--blue)',     selectedBg: 'rgba(74,158,255,0.12)' },
    correct: { bg: 'rgba(34,201,122,0.12)',         border: 'rgba(34,201,122,0.5)',         color: 'var(--green)',    selectedBg: 'rgba(34,201,122,0.12)' },
    wrong:   { bg: 'rgba(232,66,66,0.1)',           border: 'rgba(232,66,66,0.4)',          color: 'var(--red)',      selectedBg: 'rgba(232,66,66,0.1)' },
  };

  return (
    <div className="card fade-in" style={{ marginBottom: 12, padding: '14px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
          {category.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!isLocked && (
            <button
              onClick={handleRandom}
              title="Pick randomly"
              style={{
                background: 'var(--surface3)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-muted)',
                cursor: 'pointer', padding: '3px 7px', fontSize: 13,
                lineHeight: 1, transition: 'all 0.15s',
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
            <span style={{ fontSize: 15 }}>
              {!hasAnswer ? '⚪' : userPick.nominee_id === correct_nominee_id ? '✅' : '❌'}
            </span>
          )}
        </div>
      </div>

      {/* Nominees — compact wrapped button grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {nominees.map((nominee) => {
          const status = getStatus(nominee.id);
          const s = statusStyles[status];
          const isSelected = userPick?.nominee_id === nominee.id;
          const isWinner = hasAnswer && nominee.id === correct_nominee_id;

          return (
            <button
              key={nominee.id}
              onClick={() => !isLocked && onPick(category.id, nominee.id)}
              style={{
                background: isSelected ? s.selectedBg : 'var(--surface2)',
                border: `1px solid ${isSelected ? s.border : 'var(--border)'}`,
                borderRadius: 6,
                color: isSelected ? s.color : isWinner ? 'var(--gold)' : 'var(--text-dim)',
                cursor: isLocked ? 'default' : 'pointer',
                padding: '5px 10px',
                fontSize: 13,
                fontWeight: isSelected || isWinner ? 600 : 400,
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                textAlign: 'left',
                lineHeight: 1.3,
              }}
              onMouseEnter={e => {
                if (!isLocked && !isSelected) {
                  e.currentTarget.style.borderColor = 'var(--blue-dim)';
                  e.currentTarget.style.background = 'var(--blue-glow)';
                  e.currentTarget.style.color = 'var(--blue)';
                }
              }}
              onMouseLeave={e => {
                if (!isLocked && !isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--surface2)';
                  e.currentTarget.style.color = isWinner ? 'var(--gold)' : 'var(--text-dim)';
                }
              }}
            >
              <span>{nominee.name}{isWinner ? ' ★' : ''}</span>
              {nominee.subtitle && (
                <span style={{ fontSize: 11, color: isSelected ? s.color : 'var(--text-muted)', fontWeight: 400, marginTop: 1 }}>
                  {nominee.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
