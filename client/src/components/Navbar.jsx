import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Mobile menu state ────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);

  // ── MoC events ──────────────────────────────────────────────
  // We fetch the events where this user has participant_role = 'moc'
  // so we can conditionally show the "Manage Events" nav link and badge.
  // This only runs for non-admin users — admins always see the Admin link.
  // Troubleshooting: if the MoC badge or "Manage Events" link isn't appearing,
  // check that event_participants has a row with participant_role = 'moc'
  // for this user, and that /events/my-moc-events returns data.
  const [mocEvents, setMocEvents] = useState([]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      api.getMyMocEvents()
        .then(setMocEvents)
        .catch(() => setMocEvents([]));
    } else {
      setMocEvents([]);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  // ── Nav link definitions ─────────────────────────────────────
  // Rules:
  //   All users   → Events, All-Time, Profile
  //   Admin only  → + Admin, Users
  //   MoC user    → + Manage Events (links to /admin so they can
  //                  navigate into events and enter correct answers)
  //
  // Note: regular users never see /admin links — the server also
  // enforces this, but we hide them here for a clean UI.
  const navLinks = [
    { to: '/', label: 'Events' },
    { to: '/alltime', label: 'All-Time' },
    // Admin-only links
    ...(user?.role === 'admin' ? [
      { to: '/admin', label: 'Admin' },
      { to: '/admin/users', label: 'Users' },
    ] : []),
    // MoC link — only shown when user is MoC for at least one event
    // and they are not already an admin (admins have the full Admin link)
    ...(user?.role !== 'admin' && mocEvents.length > 0 ? [
      { to: '/admin', label: 'Manage Events' },
    ] : []),
    { to: '/profile', label: 'Profile' },
  ];

  // ── Role badge ───────────────────────────────────────────────
  // Shown next to the username in the desktop navbar and at the top
  // of the mobile drawer. Reflects account-level role (admin) or
  // event-level MoC status (if the user holds MoC on any event).
  const RoleBadge = () => {
    if (user?.role === 'admin') {
      return (
        <span className="badge badge-rust" style={{ fontSize: 11 }}>
          ADMIN
        </span>
      );
    }
    if (mocEvents.length > 0) {
      return (
        <span
          className="badge badge-blue"
          style={{ fontSize: 11 }}
          title={`MoC for: ${mocEvents.map(e => e.name).join(', ')}`}
        >
          🎙 MoC
        </span>
      );
    }
    return null;
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════
          TOP BAR — visible on all screen sizes
      ══════════════════════════════════════════════════════ */}
      <nav style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0 16px', height: 52,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>

          {/* Logo */}
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem', letterSpacing: '0.08em',
              color: 'var(--text)', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <span style={{ color: 'var(--rust)' }}>PICK</span>
            <span style={{ color: 'var(--blue)' }}> IT</span>
          </Link>

          {/* ── Desktop centre nav ──
              Hidden on mobile via .nav-links-admin CSS class */}
          <div
            className="nav-links-admin"
            style={{ display: 'flex', gap: 4, alignItems: 'center' }}
          >
            {navLinks.map(l => (
              <NavLink
                key={l.to + l.label}
                to={l.to}
                active={location.pathname === l.to}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* ── Desktop right side: username + role badge + logout ──
              Hidden on mobile via .nav-links-admin CSS class */}
          <div
            className="nav-links-admin"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span
              className="nav-username"
              style={{
                color: 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {user?.display_name}
            </span>
            <RoleBadge />
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          {/* ── Mobile hamburger button ──
              Shown only on small screens via the <style> block below */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
            style={{
              display: 'none', // overridden to 'block' on mobile
              background: 'none', border: 'none',
              color: 'var(--text)', fontSize: 22,
              cursor: 'pointer', padding: '4px 8px',
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          MOBILE DRAWER — slides down below the top bar
          Hidden on desktop via the <style> block below.
          Renders all nav links as full-width tap targets.
      ══════════════════════════════════════════════════════ */}
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
          {/* User identity at the top of the drawer */}
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

          {/* All nav links — full width for easy tapping */}
          {navLinks.map(l => (
            <Link
              key={l.to + l.label}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '11px 14px',
                borderRadius: 'var(--radius)',
                color: location.pathname === l.to
                  ? 'var(--blue)'
                  : 'var(--text)',
                background: location.pathname === l.to
                  ? 'var(--blue-glow)'
                  : 'transparent',
                fontWeight: 500, fontSize: 15,
                display: 'block',
                transition: 'background 0.15s',
              }}
            >
              {l.label}
            </Link>
          ))}

          {/* Logout at the bottom */}
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8, justifyContent: 'center' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}

      {/* ── Responsive breakpoint styles ──
          ≤600px: hide desktop links, show hamburger + drawer
          ≥601px: show desktop links, hide drawer */}
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

// ── Reusable desktop nav link ────────────────────────────────
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
