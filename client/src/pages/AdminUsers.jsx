import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  // ── State ────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);

  // Participation matrix: { users[], events[], matrix: { [userId]: { [eventId]: 'participant'|'moc' } } }
  const [matrix, setMatrix] = useState(null);

  const [tab, setTab] = useState('users');

  // Create user form visibility and fields
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'user',
  });

  // Reset password modal — holds the id of the user being reset
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Edit user modal — holds the id of the user being edited
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', display_name: '' });

  // ── Data loading ─────────────────────────────────────────────
  // Load both user list and participation matrix in parallel.
  // Troubleshooting: if matrix is blank, check that /admin/participants/matrix
  // is returning data — may be an auth issue if token is expired.
  const load = () => {
    api.getUsers().then(setUsers).catch(console.error);
    api.getParticipantMatrix().then(setMatrix).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  // ── Create user ──────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', password: '', display_name: '', role: 'user' });
      load();
    } catch (err) {
      // Common: username already taken, or password too short
      toast.error(err.message);
    }
  };

  // ── Reset password ───────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await api.resetPassword(resetTarget, newPassword);
      toast.success('Password reset successfully');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Edit username / display name ─────────────────────────────
  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(editTarget, editForm);
      toast.success('User updated');
      setEditTarget(null);
      load();
    } catch (err) {
      // Common: new username already taken by someone else
      toast.error(err.message);
    }
  };

  // ── Delete user ──────────────────────────────────────────────
  const handleDelete = async (user) => {
    if (!confirm(`Delete "${user.display_name}"? This removes all their picks too.`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Participation matrix toggle ──────────────────────────────
  // currentRole is the value from matrix[userId][eventId]:
  //   undefined / falsy = not a participant → clicking adds them
  //   'participant' or 'moc' = currently in → clicking removes them
  // Note: toggling role between participant and MoC is done from
  // the AdminEvent participants tab, not here. This matrix only
  // handles add/remove participation.
  const toggleParticipant = async (eventId, userId, currentRole) => {
    try {
      if (currentRole) {
        await api.removeParticipant(eventId, userId);
      } else {
        await api.addParticipant(eventId, userId);
      }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Role badge ───────────────────────────────────────────────
  // Account-level roles: admin or user only.
  // MoC is per-event now — shown in the matrix as 🎙 instead here.
  const RoleBadge = ({ role }) => {
    if (role === 'admin') {
      return <span className="badge badge-rust">ADMIN</span>;
    }
    return null;
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div className="page-header">
        <h1 className="page-title">USERS</h1>
        <button
          className="btn btn-rust"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* ── Create User Form ── */}
      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>CREATE USER</h3>
          <form onSubmit={handleCreate}>
            <div className="grid-2">

              <div className="form-group">
                <label className="label">Display Name *</label>
                <input
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  required
                  placeholder="John Smith"
                />
              </div>

              {/* Username: alphanumeric + underscores only — validated server-side too */}
              <div className="form-group">
                <label className="label">Username *</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  placeholder="johnsmith"
                />
              </div>

              <div className="form-group">
                <label className="label">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                />
              </div>

              {/* Account roles: user or admin only.
                  MoC is now a per-event role — assign it from the
                  Participants tab inside each event's admin page. */}
              <div className="form-group">
                <label className="label">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

            </div>
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <Modal onClose={() => { setResetTarget(null); setNewPassword(''); }}>
          <h3 style={{ marginBottom: 16 }}>RESET PASSWORD</h3>
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="label">New Password</label>
              <input
                type="password"
                autoFocus
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setResetTarget(null); setNewPassword(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {editTarget && (
        <Modal onClose={() => setEditTarget(null)}>
          <h3 style={{ marginBottom: 16 }}>EDIT USER</h3>
          <form onSubmit={handleEditSave}>
            <div className="form-group">
              <label className="label">Display Name</label>
              <input
                autoFocus
                value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Username</label>
              <input
                value={editForm.username}
                onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Tab Navigation ── */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '1px solid var(--border)',
        marginBottom: 20,
      }}>
        {['users', 'participation'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none',
              padding: '10px 16px',
              color: tab === t ? 'var(--blue)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontSize: '1rem', letterSpacing: '0.05em',
              borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
              cursor: 'pointer', marginBottom: -1,
              transition: 'all 0.2s',
            }}
          >
            {t === 'users' ? 'USERS' : 'PARTICIPATION'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: USERS
          Full list of all accounts with edit / reset / delete actions.
      ════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 && (
            <div className="card" style={{
              textAlign: 'center', color: 'var(--text-muted)', padding: 32,
            }}>
              No users yet.
            </div>
          )}

          {users.map(user => (
            <div
              key={user.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              {/* User info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: 8, flexWrap: 'wrap',
                }}>
                  <span style={{ fontWeight: 600 }}>{user.display_name}</span>
                  <RoleBadge role={user.role} />
                  {/* Highlight the currently logged-in admin */}
                  {user.id === currentUser?.id && (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>
                      YOU
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  @{user.username}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditTarget(user.id);
                    setEditForm({
                      username: user.username,
                      display_name: user.display_name,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setResetTarget(user.id)}
                >
                  Reset Password
                </button>
                {/* Cannot delete yourself */}
                {user.id !== currentUser?.id && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(user)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: PARTICIPATION MATRIX
          Grid showing every user × every event.
          Each cell is a toggle button:
            ✓  green  = regular participant
            🎙 blue   = MoC for that event
            +  grey   = not participating (click to add)
          Clicking an active cell removes the user from the event.
          Clicking an inactive cell adds them as a regular participant.
          To change a participant to MoC, go to the event's Participants tab.
          Troubleshooting: if a cell shows the wrong state, refresh — the
          matrix is fetched fresh on every load() call.
      ════════════════════════════════════════════════════════ */}
      {tab === 'participation' && matrix && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
            Toggle participation per user per event.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
            ✓ = participant · 🎙 = MoC · + = not participating.
            To assign MoC, first add the user then use the event's Participants tab.
          </p>

          {/* Horizontal scroll for wide tables on small screens */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>

                  {/* User column */}
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 140 }}>
                    User
                  </th>

                  {/* One column per event */}
                  {matrix.events.map(e => (
                    <th
                      key={e.id}
                      style={{ ...thStyle, textAlign: 'center', minWidth: 90 }}
                    >
                      {/* Truncate long names — full name in tooltip */}
                      <div
                        style={{
                          maxWidth: 88, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={e.name}
                      >
                        {e.name}
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'center',
                        gap: 4, marginTop: 3,
                      }}>
                        {e.is_locked && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            🔒
                          </span>
                        )}
                        {e.is_archived && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            archived
                          </span>
                        )}
                      </div>
                    </th>
                  ))}

                </tr>
              </thead>
              <tbody>
                {matrix.users.map(user => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* User name */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>
                        {user.display_name}
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        @{user.username}
                      </div>
                    </td>

                    {/* Toggle cell for each event */}
                    {matrix.events.map(ev => {
                      // currentRole: 'participant' | 'moc' | undefined
                      const currentRole = matrix.matrix[user.id]?.[ev.id];
                      const isMoCCell = currentRole === 'moc';
                      const isParticipant = !!currentRole;

                      return (
                        <td
                          key={ev.id}
                          style={{ padding: '8px 12px', textAlign: 'center' }}
                        >
                          <button
                            onClick={() => toggleParticipant(ev.id, user.id, currentRole)}
                            style={{
                              minWidth: 32, height: 28,
                              borderRadius: 14,
                              // MoC = blue, participant = green, none = grey
                              border: `2px solid ${isMoCCell
                                ? 'rgba(74,158,255,0.6)'
                                : isParticipant
                                  ? 'var(--green)'
                                  : 'var(--border)'}`,
                              background: isMoCCell
                                ? 'rgba(74,158,255,0.15)'
                                : isParticipant
                                  ? 'rgba(34,201,122,0.15)'
                                  : 'var(--surface2)',
                              color: isMoCCell
                                ? 'var(--blue)'
                                : isParticipant
                                  ? 'var(--green)'
                                  : 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: isMoCCell ? 13 : 11,
                              fontWeight: 600,
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto', padding: '0 6px',
                              transition: 'all 0.15s',
                            }}
                            title={isMoCCell
                              ? `${user.display_name} is MoC for ${ev.name} — click to remove`
                              : isParticipant
                                ? `${user.display_name} is participating — click to remove`
                                : `Add ${user.display_name} to ${ev.name}`}
                          >
                            {isMoCCell ? '🎙' : isParticipant ? '✓' : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty states */}
          {matrix.events.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>
              No events yet. Create events from the Admin page first.
            </p>
          )}
          {matrix.users.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>
              No users yet.
            </p>
          )}
        </div>
      )}

      {/* Loading state for matrix */}
      {tab === 'participation' && !matrix && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          Loading participation data...
        </div>
      )}

    </div>
  );
}

// ── Reusable modal overlay ───────────────────────────────────
// Clicking the dark backdrop calls onClose, same as Cancel buttons
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card fade-in" style={{ maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared table header style ────────────────────────────────
const thStyle = {
  padding: '8px 12px',
  color: 'var(--text-muted)',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
