import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [winners, setWinners] = useState({});
  const { user } = useAuth();

  const load = async () => {
    const evs = await api.getEvents().catch(() => []);
    setEvents(evs);
    // Fetch winners for locked/archived events
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
    try {
      await api.joinEvent(eventId);
      toast.success('Joined event!');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleLeave = async (e, eventId) => {
    e.preventDefault();
    if (!confirm('Leave this event? Your picks will be removed from the leaderboard.')) return;
    try {
      await api.leaveEvent(eventId);
      toast.success('Left event');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const active = events.filter(e => !e.is_archived);
  const archived = events.filter(e => e.is_archived);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">EVENTS</h1>
        {user?.role === 'admin' && (
          <Link to="/admin" className="btn btn-rust">+ New Event</Link>
        )}
      </div>

      {events.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          No events yet.
          {user?.role === 'admin' && (
            <div style={{ marginTop: 12 }}>
              <Link to="/admin" className="btn btn-primary">Create your first event</Link>
            </div>
          )}
        </div>
      )}

      {active.length > 0 && (
        <>
          <SectionLabel>Active Events</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {active.map(event => (
              <EventCard
                key={event.id} event={event}
                winner={winners[event.id]}
                onJoin={handleJoin} onLeave={handleLeave}
              />
            ))}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <>
          <SectionLabel>Archived Events</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {archived.map(event => (
              <EventCard
                key={event.id} event={event} archived
                winner={winners[event.id]}
                onJoin={handleJoin} onLeave={handleLeave}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </h2>
  );
}

function EventCard({ event, archived, winner, onJoin, onLeave }) {
  const { user } = useAuth();
  const canJoinLeave = !event.is_locked && !event.is_archived;
  const isParticipant = !!event.is_participant;

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, opacity: archived ? 0.75 : 1,
      transition: 'border-color 0.2s, background 0.2s',
    }}>
      <Link to={`/event/${event.id}`} style={{
        flex: 1, textDecoration: 'none', minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)' }}>
            {event.name}
          </span>
          {event.is_locked && <span className="badge badge-muted">🔒 Locked</span>}
          {!event.is_locked && !archived && <span className="badge badge-green">● Open</span>}
          {archived && <span className="badge badge-muted">Archived</span>}
          {isParticipant && !archived && <span className="badge badge-blue">Joined</span>}
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

      {/* Join/Leave for non-admin users */}
      {user?.role !== 'admin' && canJoinLeave && (
        isParticipant ? (
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
            onClick={(e) => onLeave(e, event.id)}
          >
            Leave
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={(e) => onJoin(e, event.id)}
          >
            Join
          </button>
        )
      )}
    </div>
  );
}
