import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  pending: { label: 'Requested', color: 'var(--rust)', bg: 'var(--rust-glow)', border: 'rgba(232,97,42,0.3)' },
  denied:  { label: 'Denied',    color: 'var(--red)',  bg: 'rgba(232,66,66,0.08)', border: 'rgba(232,66,66,0.3)' },
};

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [winners, setWinners] = useState({});
  const [tab, setTab] = useState('mine');
  const { user } = useAuth();

  const load = async () => {
    const evs = await api.getEvents().catch(() => []);
    setEvents(evs);
    const locked = evs.filter(e => e.is_locked || e.is_archived);
    const winnerMap = {};
    await Promise.all(locked.map(async (e) => {
      try {
        const lb = await api.getLeaderboard(e.id);
        const top = lb.scores?.find(s => s.correct > 0);
        if (top) winnerMap[e.id] = top;
      } catch {}
    }));
    setWinners(winnerMap);
  };

  useEffect(() => { load(); }, []);

  const handleJoin = async (e, eventId) => {
    e.preventDefault();
    try { await api.joinEvent(eventId); toast.success('Joined!'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleLeave = async (e, eventId) => {
    e.preventDefault();
    if (!confirm('Leave this event?')) return;
    try { await api.leaveEvent(eventId); toast.success('Left event'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleRequest = async (e, eventId) => {
    e.preventDefault();
    try { await api.requestJoin(eventId); toast.success('Request sent!'); load(); }
    catch (err) { toast.error(err.message); }
  };

  // Partition events
  const myEvents = events.filter(e => e.is_participant && !e.is_archived);
  const lockedMyEvents = myEvents.filter(e => e.is_locked);
  const activeMyEvents = myEvents.filter(e => !e.is_locked);
  const pastEvents = events.filter(e => e.is_participant && e.is_archived);
  const otherEvents = events.filter(e => !e.is_participant);

  const tabs = [
    { key: 'mine', label: 'My Events', count: myEvents.length },
    { key: 'other', label: 'Other Events', count: otherEvents.length },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">EVENTS</h1>
        {user?.role === 'admin' && (
          <Link to="/admin" className="btn btn-rust">+ New Event</Link>
        )}
      </div>

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: 'none', border: 'none',
            padding: '10px 16px',
            color: tab === t.key ? 'var(--blue)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem', letterSpacing: '0.05em',
            borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
            cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: tab === t.key ? 'var(--blue)' : 'var(--surface3)',
                color: tab === t.key ? '#fff' : 'var(--text-muted)',
                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontFamily: 'var(--font-mono)',
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── My Events Tab ── */}
      {tab === 'mine' && (
        <div>
          {myEvents.length === 0 && pastEvents.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              You haven't joined any events yet.
              <div style={{ marginTop: 8, fontSize: 13 }}>Check the Other Events tab to request access.</div>
            </div>
          )}

          {/* Locked / Live */}
          {lockedMyEvents.length > 0 && (
            <>
              <SectionLabel icon="🔴" label="Live Now" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {lockedMyEvents.map(e => (
                  <EventCard key={e.id} event={e} winner={winners[e.id]} onJoin={handleJoin} onLeave={handleLeave} />
                ))}
              </div>
            </>
          )}

          {/* Active / Upcoming */}
          {activeMyEvents.length > 0 && (
            <>
              <SectionLabel icon="🟢" label="Active & Upcoming" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {activeMyEvents.map(e => (
                  <EventCard key={e.id} event={e} winner={winners[e.id]} onJoin={handleJoin} onLeave={handleLeave} />
                ))}
              </div>
            </>
          )}

          {/* Past */}
          {pastEvents.length > 0 && (
            <>
              <SectionLabel icon="📁" label="Past Events" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pastEvents.map(e => (
                  <EventCard key={e.id} event={e} archived winner={winners[e.id]} onJoin={handleJoin} onLeave={handleLeave} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Other Events Tab ── */}
      {tab === 'other' && (
        <div>
          {otherEvents.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              No other events available.
            </div>
          )}

          {otherEvents.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otherEvents.map(e => (
                <OtherEventCard
                  key={e.id} event={e}
                  winner={winners[e.id]}
                  onRequest={handleRequest}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function EventCard({ event, archived, winner, onJoin, onLeave }) {
  const { user } = useAuth();
  const canJoinLeave = !event.is_locked && !event.is_archived && user?.role !== 'admin';

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, opacity: archived ? 0.75 : 1,
      borderLeft: event.is_locked && !archived ? '3px solid var(--rust)' : undefined,
    }}>
      <Link to={`/event/${event.id}`} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)' }}>
            {event.name}
          </span>
          {event.is_locked && !archived && <span className="badge badge-rust">🔴 Live</span>}
          {!event.is_locked && !archived && <span className="badge badge-green">● Open</span>}
          {archived && <span className="badge badge-muted">Archived</span>}
        </div>
        {event.description && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{event.description}</div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {event.event_date && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              📅 {new Date(event.event_date).toLocaleDateString()}
            </span>
          )}
          {winner && event.is_locked && (
            <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
              🏆 {winner.display_name} ({winner.correct} pts)
            </span>
          )}
        </div>
      </Link>
      {canJoinLeave && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          onClick={(e) => onLeave(e, event.id)}
        >
          Leave
        </button>
      )}
    </div>
  );
}

function OtherEventCard({ event, winner, onRequest, onJoin }) {
  const { user } = useAuth();
  const isLocked = event.is_locked || event.is_archived;
  const requestStatus = event.request_status;

  const renderAction = () => {
    if (isLocked) {
      return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Read only</span>;
    }
    if (requestStatus === 'pending') {
      return (
        <span style={{
          padding: '5px 12px', borderRadius: 'var(--radius)',
          background: STATUS_LABELS.pending.bg,
          border: `1px solid ${STATUS_LABELS.pending.border}`,
          color: STATUS_LABELS.pending.color,
          fontSize: 12, fontWeight: 600,
        }}>
          ⏳ Pending
        </span>
      );
    }
    if (requestStatus === 'denied') {
      return (
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--red)', borderColor: 'rgba(232,66,66,0.3)', flexShrink: 0 }}
          onClick={(e) => onRequest(e, event.id)}
        >
          Re-request
        </button>
      );
    }
    // No request yet — show join (open events) or request button
    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ flexShrink: 0 }}
        onClick={(e) => onJoin(e, event.id)}
      >
        Join
      </button>
    );
  };

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, opacity: isLocked ? 0.65 : 1,
    }}>
      <Link to={`/event/${event.id}`} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)' }}>
            {event.name}
          </span>
          {event.is_locked && !event.is_archived && <span className="badge badge-rust">🔴 Live</span>}
          {!event.is_locked && !event.is_archived && <span className="badge badge-blue">Open</span>}
          {event.is_archived && <span className="badge badge-muted">Archived</span>}
        </div>
        {event.description && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{event.description}</div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {event.event_date && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              📅 {new Date(event.event_date).toLocaleDateString()}
            </span>
          )}
          {winner && event.is_locked && (
            <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
              🏆 {winner.display_name} ({winner.correct} pts)
            </span>
          )}
        </div>
      </Link>
      <div style={{ flexShrink: 0 }}>{renderAction()}</div>
    </div>
  );
}
