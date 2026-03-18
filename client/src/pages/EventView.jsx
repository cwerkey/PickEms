import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import CategoryCard from '../components/CategoryCard';
import Leaderboard from '../components/Leaderboard';
import Countdown from '../components/Countdown';

export default function EventView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [myPicks, setMyPicks] = useState({});
  const [leaderRefresh, setLeaderRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');

  const load = useCallback(async () => {
    try {
      const [ev, picks] = await Promise.all([
        api.getEvent(id),
        api.getMyPicks(id),
      ]);
      setEvent(ev);
      const pickMap = {};
      picks.forEach(p => { pickMap[p.category_id] = p; });
      setMyPicks(pickMap);
    } catch (e) {
      toast.error(e.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const i = setInterval(() => setLeaderRefresh(r => r + 1), 15000);
    return () => clearInterval(i);
  }, []);

  const handlePick = async (categoryId, nomineeId) => {
    if (event?.is_locked) return;
    const prev = myPicks[categoryId];
    setMyPicks(p => ({ ...p, [categoryId]: { ...p[categoryId], nominee_id: nomineeId, category_id: categoryId } }));
    try {
      await api.savePick({ event_id: parseInt(id), category_id: categoryId, nominee_id: nomineeId });
      setLeaderRefresh(r => r + 1);
    } catch (e) {
      toast.error(e.message);
      setMyPicks(p => ({ ...p, [categoryId]: prev }));
      load();
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading event...</div>
    </div>
  );
  if (!event) return null;

  const totalCats = event.categories?.length || 0;
  const pickedCount = Object.keys(myPicks).length;
  const correctCount = Object.values(myPicks).filter(p => {
    const cat = event.categories?.find(c => c.id === p.category_id);
    return cat?.correct_nominee_id && cat.correct_nominee_id === p.nominee_id;
  }).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{event.name}</h1>
          {event.description && (
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{event.description}</p>
          )}
        </div>
        <Countdown lockTime={event.lock_time} isLocked={event.is_locked} />
      </div>

{/* Stats Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatBadge label="Picks" value={`${pickedCount} / ${totalCats}`} color="var(--blue)" />
        {event.is_locked && (
          <StatBadge label="Correct" value={correctCount} color="var(--green)" />
        )}
        {event.event_date && (
          <StatBadge label="Date" value={new Date(event.event_date).toLocaleDateString()} color="var(--text-dim)" />
        )}
      </div>

      {/* Tab Nav */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: '1px solid var(--border)', paddingBottom: 0,
      }}>
        {['leaderboard', 'picks'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none',
            padding: '10px 16px',
            color: tab === t ? 'var(--blue)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem', letterSpacing: '0.05em',
            borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1,
          }}>
            {t === 'picks' ? 'MY PICKS' : 'LEADERBOARD'}
          </button>
        ))}
      </div>

      {tab === 'picks' && (
        <div>
          {event.is_locked && (
            <div style={{
              padding: '12px 16px', marginBottom: 16,
              background: 'rgba(232,66,66,0.08)', border: '1px solid rgba(232,66,66,0.25)',
              borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13,
            }}>
              🔒 This event is locked — your picks are read-only. Colors show correct answers as they're revealed.
            </div>
          )}
          {!event.is_locked && pickedCount < totalCats && (
            <div style={{
              padding: '12px 16px', marginBottom: 16,
              background: 'var(--blue-glow)', border: '1px solid rgba(74,158,255,0.25)',
              borderRadius: 'var(--radius)', color: 'var(--blue)', fontSize: 13,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>You have {totalCats - pickedCount} unpicked {totalCats - pickedCount === 1 ? 'category' : 'categories'} remaining.</span>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--blue)', color: '#fff', marginLeft: 12 }}
                onClick={() => {
                  event.categories?.forEach(cat => {
                    if (!myPicks[cat.id] && cat.nominees?.length) {
                      const pick = cat.nominees[Math.floor(Math.random() * cat.nominees.length)];
                      handlePick(cat.id, pick.id);
                    }
                  });
                }}
              >
                🎲 Random Fill All
              </button>
            </div>
          )}
          {event.categories?.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              userPick={myPicks[cat.id]}
              isLocked={!!event.is_locked}
              onPick={handlePick}
            />
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <Leaderboard eventId={id} refresh={leaderRefresh} />
      )}
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '6px 12px',
      display: 'flex', flexDirection: 'column',
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
        {value}
      </span>
    </div>
  );
}
