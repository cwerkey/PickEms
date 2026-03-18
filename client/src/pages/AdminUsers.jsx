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
