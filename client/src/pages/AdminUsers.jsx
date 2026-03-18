import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();

  // ── State ────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState(null); // participation matrix data
  const [tab, setTab] = useState('users');

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'user',
  });

  // Reset password modal — stores the target user's id
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Edit user modal — stores the target user's id
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', display_name: '' });

  // ── Data loading ─────────────────────────────────────────────
  // Loads both the user list and the participation matrix together
  const load = () => {
    api.getUsers().then(setUsers).catch(console.error);
    // Matrix: { users[], events[], matrix: { [userId]: { [eventId]: true } } }
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
      // Common errors: username taken, password too short
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

  // ── Edit user (username / display name) ──────────────────────
  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(editTarget, editForm);
      toast.success('User updated');
      setEditTarget(null);
      load();
    } catch (err) {
      // Common error: username already taken by another user
      toast.error(err.message);
    }
  };

  // ── Delete user ──────────────────────────────────────────────
  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.display_name}"? This removes all their picks.`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Participation matrix toggle ──────────────────────────────
  // isIn = currently participating, click removes them
  // !isIn = not participating, click adds them
  const toggleParticipant = async (eventId, userId, isIn) => {
    try {
      if (isIn) {
        await api.removeParticipant(eventId, userId);
      } else {
        await api.addParticipant(eventId, userId);
      }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Role display helper ──────────────────────────────────────
  const RoleBadge = ({ role }) => {
    if (role === 'admin') return <span className="badge badge-rust">ADMIN</span>;
    if (role === 'moc') return <span className="badge badge-blue">MoC</span>;
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

              {/* Username: alphanumeric + underscores only (validated server-side too) */}
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

              {/* Role options:
                  user  = standard participant
                  moc   = Master of Ceremony (lock events + enter winners only)
                  admin = full access */}
              <div className="form-group">
                <label className="label">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="moc">Master of Ceremony (MoC)</option>
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
          List of all users with edit / reset password / delete actions
      ════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{user.display_name}</span>
                  <RoleBadge role={user.role} />
                  {/* Highlight the currently logged-in user */}
                  {user.id === currentUser?.id && (
                    <span className="badge badge-green" style={{ fontSize: 11 }}>YOU</span>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  @{user.username}
                </div>
              </div>

              {/* User actions */}
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
                {/* Can't delete yourself */}
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
          Grid of users × events with toggleable checkmarks
          Green circle = participating, grey + = not participating
          Troubleshooting: if matrix is empty, no events exist yet
      ════════════════════════════════════════════════════════ */}
      {tab === 'participation' && matrix && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Toggle participation per user per event. Green = participating.
            Locked/archived events can still be toggled here by admins.
          </p>

          {/* Horizontal scroll wrapper for wide tables */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>

                  {/* User column header */}
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 140 }}>
                    User
                  </th>

                  {/* One column per event */}
                  {matrix.events.map(e => (
                    <th
                      key={e.id}
                      style={{ ...thStyle, textAlign: 'center', minWidth: 90 }}
                    >
                      {/* Truncate long event names with a tooltip */}
                      <div
                        style={{
                          maxWidth: 88, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={e.name}
                      >
                        {e.name}
                      </div>
                      {/* Status indicators below event name */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 3 }}>
                        {e.is_locked && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔒</span>
                        )}
                        {e.is_archived && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>archived</span>
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
                    {/* User name + username */}
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

                    {/* Toggle button for each event */}
                    {matrix.events.map(ev => {
                      const isIn = !!(matrix.matrix[user.id]?.[ev.id]);
                      return (
                        <td
                          key={ev.id}
                          style={{ padding: '8px 12px', textAlign: 'center' }}
                        >
                          <button
                            onClick={() => toggleParticipant(ev.id, user.id, isIn)}
                            style={{
                              width: 28, height: 28,
                              borderRadius: '50%',
                              border: `2px solid ${isIn ? 'var(--green)' : 'var(--border)'}`,
                              background: isIn ? 'rgba(34,201,122,0.15)' : 'var(--surface2)',
                              color: isIn ? 'var(--green)' : 'var(--text-muted)',
                              cursor: 'pointer', fontSize: 14,
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto',
                              transition: 'all 0.15s',
                            }}
                            title={isIn
                              ? `Remove ${user.display_name} from ${ev.name}`
                              : `Add ${user.display_name} to ${ev.name}`
                            }
                          >
                            {isIn ? '✓' : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state — no events or no users */}
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

// ── Reusable modal wrapper ───────────────────────────────────
// Renders a centered overlay with a card inside
// onClose called when user clicks backdrop or cancel buttons
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      // Click backdrop to close
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card fade-in" style={{ maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── Table header style ───────────────────────────────────────
const thStyle = {
  padding: '8px 12px',
  color: 'var(--text-muted)',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};
