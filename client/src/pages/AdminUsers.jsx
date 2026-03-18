import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', role: 'user' });
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const { user: currentUser } = useAuth();

  const load = () => api.getUsers().then(setUsers).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', password: '', display_name: '', role: 'user' });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await api.resetPassword(resetTarget, newPassword);
      toast.success('Password reset');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.display_name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
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

      {resetTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div className="card fade-in" style={{ maxWidth: 360, width: '100%' }}>
            <h3 style={{ marginBottom: 16 }}>RESET PASSWORD</h3>
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="label">New Password</label>
                <input
                  type="password" autoFocus
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  required minLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setResetTarget(null); setNewPassword(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(user => (
          <div key={user.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{user.display_name}</span>
                {user.role === 'admin' && <span className="badge badge-rust">ADMIN</span>}
                {user.id === currentUser?.id && <span className="badge badge-blue">YOU</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                @{user.username}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setResetTarget(user.id)}>
                Reset Password
              </button>
              {user.id !== currentUser?.id && (
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}