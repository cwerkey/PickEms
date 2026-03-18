import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function MoCDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyMocEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '50vh',
    }}>
      <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">MANAGE EVENTS</h1>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        You are the Master of Ceremony for the events below. You can enter
        correct answers and lock picks.
      </p>

      {events.length === 0 && (
        <div className="card" style={{
          textAlign: 'center', color: 'var(--text-muted)', padding: 48,
        }}>
          You haven't been assigned as MoC for any events yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map(event => (
          <Link
            key={event.id}
            to={`/admin/event/${event.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border-bright)';
                e.currentTarget.style.background = 'var(--surface2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: 12,
              }}>
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, marginBottom: 4, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.2rem', color: 'var(--text)',
                    }}>
                      {event.name}
                    </span>
                    {event.is_locked
                      ? <span className="badge badge-muted">🔒 Locked</span>
                      : <span className="badge badge-green">● Open</span>}
                    {event.is_archived && (
                      <span className="badge badge-muted">Archived</span>
                    )}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {event.description}
                    </div>
                  )}
                  {event.event_date && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      📅 {new Date(event.event_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--blue)', fontSize: 20, flexShrink: 0 }}>
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
