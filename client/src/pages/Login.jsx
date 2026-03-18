import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setup, setSetup] = useState({ username: '', password: '', display_name: '', setup_key: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await api.setup(setup);
      localStorage.setItem('pickems_token', token);
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '4rem',
          letterSpacing: '0.1em',
          lineHeight: 1,
        }}>
          <span style={{ color: 'var(--rust)' }}>PICK</span>
          <span style={{ color: 'var(--blue)' }}>EMS</span>
        </div>
        <div style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 13 }}>
          Family Awards Picker
        </div>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        {!showSetup ? (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 20 }}>SIGN IN</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="label">Username</label>
                <input
                  type="text" autoFocus autoComplete="username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input
                  type="password" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <button
              onClick={() => setShowSetup(true)}
              style={{
                marginTop: 16, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              First time? Set up admin account
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 6 }}>ADMIN SETUP</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              One-time setup. Requires the setup key from your .env file.
            </p>
            <form onSubmit={handleSetup}>
              {[
                ['Display Name', 'display_name', 'text', 'Your Name'],
                ['Username', 'username', 'text', 'admin'],
                ['Password', 'password', 'password', ''],
                ['Setup Key', 'setup_key', 'password', 'From .env ADMIN_SETUP_KEY'],
              ].map(([label, field, type, placeholder]) => (
                <div className="form-group" key={field}>
                  <label className="label">{label}</label>
                  <input
                    type={type} placeholder={placeholder}
                    value={setup[field]}
                    onChange={e => setSetup(s => ({ ...s, [field]: e.target.value }))}
                    required
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowSetup(false)}>Back</button>
                <button type="submit" className="btn btn-rust" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}