import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link to="/" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem', letterSpacing: '0.08em',
            color: 'var(--text)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: 'var(--rust)' }}>PICK</span>
            <span style={{ color: 'var(--blue)' }}> IT</span>
          </Link>
          <div style={{ display: 'flex', gap: 4 }}>
            <NavLink to="/alltime" active={location.pathname === '/alltime'}>All-Time</NavLink>
            {user?.role === 'admin' && (
              <>
                <NavLink to="/admin" active={location.pathname === '/admin'}>Admin</NavLink>
                <NavLink to="/admin/users" active={location.pathname === '/admin/users'}>Users</NavLink>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {user?.display_name}
          </span>
          {user?.role === 'admin' && (
            <span className="badge badge-rust" style={{ fontSize: 11 }}>ADMIN</span>
          )}
          <NavLink to="/settings" active={location.pathname === '/settings'}>Settings</NavLink>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link to={to} style={{
      padding: '6px 12px', borderRadius: 'var(--radius)',
      fontSize: 14, fontWeight: 500,
      color: active ? 'var(--blue)' : 'var(--text-dim)',
      background: active ? 'var(--blue-glow)' : 'transparent',
      textDecoration: 'none', transition: 'all 0.2s',
    }}>
      {children}
    </Link>
  );
}
