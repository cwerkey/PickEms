import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventView from './pages/EventView';
import AdminDashboard from './pages/AdminDashboard';
import AdminEvent from './pages/AdminEvent';
import AdminUsers from './pages/AdminUsers';
import AllTime from './pages/AllTime';
import Profile from './pages/Profile';
import MoCDashboard from './pages/MoCDashboard';

function ProtectedRoute({ children, adminOnly, allowMoC }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
    }}>
      <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        Loading...
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  // adminOnly: only full admins allowed
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

        {/* All authenticated users */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/event/:id" element={<ProtectedRoute><EventView /></ProtectedRoute>} />
        <Route path="/alltime" element={<ProtectedRoute><AllTime /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<Navigate to="/profile" />} />

        {/* MoC dashboard — any logged-in user can hit this;
            the page itself only shows events where they are MoC */}
        <Route path="/moc" element={<ProtectedRoute><MoCDashboard /></ProtectedRoute>} />

        {/* Admin event page — also used by MoC users when they follow
            the link from /moc. The page internally checks isMoC and
            restricts the UI accordingly. No adminOnly guard here. */}
        <Route path="/admin/event/:id" element={<ProtectedRoute><AdminEvent /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
