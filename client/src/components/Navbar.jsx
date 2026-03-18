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

  // ── Nav link definitions by role ─────────────────────────────
  // Each role sees a different set of nav links:
  //   admin → Events, All-Time, Admin, Users, Profile
  //   moc   → Events, All-Time, Events (admin manage link), Profile
  //   user  → Events, All-Time, Profile
  const navLinks = [
    { to: '/', label: 'Events' },
    { to: '/alltime', label: 'All-Time' },
    // Admin-only links
    ...(user?.role === 'admin' ? [
      { to: '/admin', label: 'Admin' },
      { to: '/admin/users', label: 'Users' },
    ] : []),
    // MoC gets access to the admin events list so they can
    // navigate into individual events to enter correct answers
    // and lock events — but not unlock, not manage users
    ...(user?.role === 'moc' ? [
      { to: '/admin', label: 'Manage Events' },
    ] : []),
    { to: '/profile', label: 'Profile' },
  ];

  // ── Role badge helper ────────────────────────────────────────
  const RoleBadge = () => {
    if (user?.role === 'admin') {
      return <span className="badge badge-rust" style={{ fontSize: 11 }}>ADMIN</span>;
    }
    if (user?.role === 'moc') {
      // MoC = Master of Ceremony
      return <span className="badge badge-blue" style={{ fontSize: 11 }}>MoC</span>;
    }
    return null;
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ── Desktop / Mobile top bar ── */}
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

          {/* ── Desktop: centre nav links ── */}
          {/* Hidden on mobile via .nav-links-admin CSS class */}
          <div className="nav-links-admin" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {navLinks.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                active={location.pathname === l.to}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* ── Desktop: right side — username + role badge + logout ── */}
          <div className="nav-links-admin" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="nav-username"
              style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}
            >
              {user?.display_name}
            </span>
            <RoleBadge />
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* ── Mobile: hamburger button ── */}
          {/* Shown only on small screens via inline style + CSS override below */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'none', // overridden to block on mobile via <style> below
              background: 'none', border: 'none',
              color: 'var(--text)', fontSize: 22,
              cursor: 'pointer', padding: '4px 8px',
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>

        </div>
      </nav>

      {/* ── Mobile: slide-down drawer menu ── */}
      {/* Rendered below the nav bar, hidden on desktop via <style> below */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed', top: 52, left: 0, right: 0, zIndex: 99,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '12px 16px 20px',
            display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {/* Username + role badge at top of drawer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 8, paddingBottom: 8,
            borderBottom: '1px solid var(--border)',
          }}>
            {user?.display_name}
            <RoleBadge />
          </div>

          {/* All nav links as full-width tap targets */}
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '11px 14px',
                borderRadius: 'var(--radius)',
                color: location.pathname === l.to ? 'var(--blue)' : 'var(--text)',
                background: location.pathname === l.to ? 'var(--blue-glow)' : 'transparent',
                fontWeight: 500, fontSize: 15,
                display: 'block',
                transition: 'background 0.15s',
              }}
            >
              {l.label}
            </Link>
          ))}

          {/* Logout at bottom of drawer */}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8, justifyContent: 'center' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}

      {/* ── Responsive CSS ── */}
      {/* Breakpoint: ≤600px shows hamburger, hides desktop links */}
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

// ── Reusable nav link component ──────────────────────────────
function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius)',
        fontSize: 14, fontWeight: 500,
        color: active ? 'var(--blue)' : 'var(--text-dim)',
        background: active ? 'var(--blue-glow)' : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </Link>
  );
}
