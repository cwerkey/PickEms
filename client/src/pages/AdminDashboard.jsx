import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', event_date: '', lock_time: '' });
  const navigate = useNavigate();

  const load = () => {
    api.getEvents().then(setEvents).catch(console.error);
    api.getJoinRequests().then(setJoinRequests).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createEvent(form);
      toast.success('Event created');
      setShowCreate(false);
      setForm({ name: '', description: '', event_date: '', lock_time: '' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleLock = async (event) => {
    try {
      await api.updateEvent(event.id, { is_locked: event.is_locked ? 0 : 1 });
      toast.success(event.is_locked ? 'Unlocked' : 'Locked');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggleArchive = async (event) => {
    try {
      await api.updateEvent(event.id, { is_archived: event.is_archived ? 0 : 1 });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (event) => {
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try { await api.deleteEvent(event.id); toast.success('Event deleted'); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handleResolve = async (requestId, status) => {
    try {
      await api.resolveJoinRequest(requestId, status);
      toast.success(status === 'approved' ? 'Approved!' : 'Denied');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">ADMIN</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/users" className="btn btn-ghost">Manage Users</Link>
          <button className="btn btn-rust" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ New Event'}
          </button>
        </div>
      </div>

      {/* Join Request Banner */}
      {joinRequests.length > 0 && (
        <div className="card fade-in" style={{
          marginBottom: 24,
          borderLeft: '3px solid var(--rust)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>📬</span>
            <h3 style={{ fontSize: '1rem', color: 'var(--rust)' }}>
              PENDING JOIN REQUESTS ({joinRequests.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {joinRequests.map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, padding: '10px 14px',
                background: 'var(--surface2)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', flexWrap: 'wrap',
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{req.display_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 6px' }}>wants to join</span>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{req.event_name}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    @{req.username} · {new Date(req.requested_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'rgba(34,201,122,0.12)', color: 'var(--green)', border: '1px solid rgba(34,201,122,0.4)' }}
                    onClick={() => handleResolve(req.id, 'approved')}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleResolve(req.id, 'denied')}
                  >
                    ✕ Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event Form */}
      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>CREATE EVENT</h3>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="label">Event Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="96th Academy Awards" />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="form-group">
                <label className="label">Event Date</label>
                <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Auto-Lock Time</label>
                <input type="datetime-local" value={form.lock_time} onChange={e => setForm(f => ({ ...f, lock_time: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create Event</button>
          </form>
        </div>
      )}

      <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        All Events
      </h2>

      {events.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
          No events yet. Create one above.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map(event => (
          <div key={event.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{event.name}</span>
                {event.is_locked && <span className="badge badge-rust">🔒 Locked</span>}
                {event.is_archived && <span className="badge badge-muted">Archived</span>}
              </div>
              {event.event_date && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/admin/event/${event.id}`} className="btn btn-ghost btn-sm">Manage →</Link>
              <button
                className="btn btn-sm btn-ghost"
                style={{ color: event.is_locked ? 'var(--green)' : 'var(--rust)' }}
                onClick={() => handleToggleLock(event)}
              >
                {event.is_locked ? '🔓 Unlock' : '🔒 Lock'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleToggleArchive(event)}>
                {event.is_archived ? 'Unarchive' : 'Archive'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(event)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
