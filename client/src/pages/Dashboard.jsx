import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    api.getEvents().then(setEvents).catch(console.error);
  }, []);

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

      {active.length === 0 && archived.length === 0 && (
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
          <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Active Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {active.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        </>
      )}

      {archived.length > 0 && (
        <>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Archived Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {archived.map(event => <EventCard key={event.id} event={event} archived />)}
          </div>
        </>
      )}
    </div>
  );
}

function EventCard({ event, archived }) {
  return (
    <Link to={`/event/${event.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', transition: 'all 0.2s',
        opacity: archived ? 0.65 : 1,
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.background = 'var(--surface2)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)' }}>
              {event.name}
            </span>
            {event.is_locked && <span className="badge badge-muted">🔒 Locked</span>}
            {!event.is_locked && !archived && <span className="badge badge-green">● Open</span>}
            {archived && <span className="badge badge-muted">Archived</span>}
          </div>
          {event.description && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{event.description}</div>
          )}
          {event.event_date && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              📅 {new Date(event.event_date).toLocaleDateString()}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
      </div>
    </Link>
  );
}