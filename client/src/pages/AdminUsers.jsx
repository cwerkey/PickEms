import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [tab, setTab] = useState('users');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', display_name: '' });
  const { user: currentUser } = useAuth();

  const load = () => {
    api.getUsers().then(setUsers).catch(console.error);
    api.getParticipantMatrix().then(setMatrix).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', password: '', display_name: '', role: 'user' });
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await api.resetPassword(resetTarget, newPassword);
      toast.success('Password reset');
      setResetTarget(null); setNewPassword('');
    } catch (err) { toast.error(err.message); }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(editTarget, editForm);
      toast.success('User updated');
      setEditTarget(null); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.display_name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const toggleParticipant = async (eventId, userId, isIn) => {
    try {
      if (isIn) await api.removeParticipant(eventId, userId);
      else await api.addParticipant(eventId, userId);
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">USERS</h1>
        <button className="btn btn-rust" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>CREATE USER</h3>
          <form onSubmit={handleCreate}>
            <div className="grid-2">
              <div className="form-group">
                <label className="label">Display Name *</label>
                <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} required placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="label">Username *</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="johnsmith" />
              </div>
              <div className="form-group">
                <label className="label">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="label">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create User</button>
          </form>
        </div>
      )}

      {/* Modals */}
      {resetTarget && (
        <Modal onClose={() => { setResetTarget(null); setNewPassword(''); }}>
          <h3 style={{ marginBottom: 16 }}>RESET PASSWORD</h3>
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="label">New Password</label>
              <input type="password" autoFocus value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setResetTarget(null); setNewPassword(''); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Reset Password</button>
            </div>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal onClose={() => setEditTarget(null)}>
          <h3 style={{ marginBottom: 16 }}>EDIT USER</h3>
          <form onSubmit={handleEditSave}>
            <div className="form-group">
              <label className="label">Display Name</label>
              <input autoFocus value={editForm.display_name} onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Username</label>
              <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tab Nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {['users', 'participation'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none',
            padding: '10px 16px',
            color: tab === t ? 'var(--blue)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.05em',
            borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
            cursor: 'pointer', marginBottom: -1,
          }}>
            {t === 'users' ? 'USERS' : 'PARTICIPATION'}
          </button>
        ))}
      </div>

      {/* Users List */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(user => (
            <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{user.display_name}</span>
                  {user.role === 'admin' && <span className="badge badge-rust">ADMIN</span>}
                  {user.id === currentUser?.id && <span className="badge badge-blue">YOU</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>@{user.username}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditTarget(user.id); setEditForm({ username: user.username, display_name: user.display_name }); }}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setResetTarget(user.id)}>Reset Password</button>
                {user.id !== currentUser?.id && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Participation Matrix */}
      {tab === 'participation' && matrix && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Toggle participation per user per event. Locked/archived events are shown but can't be joined after locking.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 130 }}>User</th>
                  {matrix.events.map(e => (
                    <th key={e.id} style={{ ...thStyle, textAlign: 'center', minWidth: 90 }}>
                      <div style={{ maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.name}>
                        {e.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 3 }}>
                        {e.is_locked ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>🔒</span> : null}
                        {e.is_archived ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>archived</span> : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text)' }}>
                      {user.display_name}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>@{user.username}</div>
                    </td>
                    {matrix.events.map(ev => {
                      const isIn = !!(matrix.matrix[user.id]?.[ev.id]);
                      return (
                        <td key={ev.id} style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => toggleParticipant(ev.id, user.id, isIn)}
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              border: `2px solid ${isIn ? 'var(--green)' : 'var(--border)'}`,
                              background: isIn ? 'rgba(34,201,122,0.15)' : 'var(--surface2)',
                              color: isIn ? 'var(--green)' : 'var(--text-muted)',
                              cursor: 'pointer', fontSize: 14,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto', transition: 'all 0.15s',
                            }}
                            title={isIn ? 'Remove from event' : 'Add to event'}
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
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card fade-in" style={{ maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '8px 12px', color: 'var(--text-muted)',
  fontWeight: 500, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};
