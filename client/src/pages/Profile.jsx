import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout, theme, setTheme } = useAuth();
  const [profileForm, setProfileForm] = useState({ display_name: user?.display_name || '', username: user?.username || '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateMe(profileForm);
      toast.success('Profile updated — please log in again');
      setTimeout(() => logout(), 1500);
    } catch (err) { toast.error(err.message); }
    finally { setSavingProfile(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) return toast.error('Passwords do not match');
    if (passwordForm.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPassword(true);
    try {
      await api.updateMe({ current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      toast.success('Password updated — please log in again');
      setTimeout(() => logout(), 1500);
    } catch (err) { toast.error(err.message); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="page-header">
        <h1 className="page-title">PROFILE</h1>
      </div>

      {/* Theme Toggle */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>APPEARANCE</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {['dark', 'light'].map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              style={{
                flex: 1, padding: '12px', borderRadius: 'var(--radius)',
                border: `2px solid ${theme === t ? 'var(--blue)' : 'var(--border)'}`,
                background: theme === t ? 'var(--blue-glow)' : 'var(--surface2)',
                color: theme === t ? 'var(--blue)' : 'var(--text-dim)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>PROFILE INFO</h3>
        <form onSubmit={handleProfileSave}>
          <div className="form-group">
            <label className="label">Display Name</label>
            <input value={profileForm.display_name} onChange={e => setProfileForm(f => ({ ...f, display_name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Username</label>
            <input value={profileForm.username} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Saving will log you out so new credentials take effect.
          </p>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>CHANGE PASSWORD</h3>
        <form onSubmit={handlePasswordSave}>
          <div className="form-group">
            <label className="label">Current Password</label>
            <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">New Password</label>
            <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))} required minLength={6} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Saving will log you out so your new password takes effect.
          </p>
          <button type="submit" className="btn btn-rust" disabled={savingPassword}>
            {savingPassword ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
