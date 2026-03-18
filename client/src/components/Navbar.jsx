import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

const navLinks = [
    { to: '/', label: 'Events' },
    { to: '/alltime', label: 'All-Time' },
    ...(user?.role === 'admin' ? [
      { to: '/admin', label: 'Admin' },
      { to: '/admin/users', label: 'Users' },
    ] : []),
    { to: '/profile', label: 'Profile' },
  ];

  return (
    <>
      <nav style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 16px', height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Link to="/" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem', letterSpacing: '0.08em',
            color: 'var(--text)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <span style={{ color: 'var(--rust)' }}>PICK</span>
            <span style={{ color: 'var(--blue)' }}> IT</span>
          </Link>

          {/* Desktop nav */}
          <div className="nav-links-admin" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} active={location.pathname === l.to} onClick={() => {}}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="nav-links-admin" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="nav-username" style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              {user?.display_name}
            </span>
            {user?.role === 'admin' && (
              <span className="badge badge-rust" style={{ fontSize: 11 }}>ADMIN</span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'none',
              background: 'none', border: 'none',
              color: 'var(--text)', fontSize: 22,
              cursor: 'pointer', padding: '4px 8px',
            }}
            className="mobile-menu-btn"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 99,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px 16px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}
          className="mobile-menu"
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            {user?.display_name}
            {user?.role === 'admin' && <span className="badge badge-rust" style={{ fontSize: 10, marginLeft: 8 }}>ADMIN</span>}
          </div>
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                color: location.pathname === l.to ? 'var(--blue)' : 'var(--text)',
                background: location.pathname === l.to ? 'var(--blue-glow)' : 'transparent',
                fontWeight: 500, fontSize: 15,
                display: 'block',
              }}
            >
              {l.label}
            </Link>
          ))}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8, justifyContent: 'center' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}

      {/* Extra CSS for mobile-only elements */}
      <style>{`
        @media (max-width: 600px) {
          .nav-links-admin { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 601px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}

function NavLink({ to, active, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{
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
