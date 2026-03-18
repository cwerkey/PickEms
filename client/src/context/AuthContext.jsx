import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(() => localStorage.getItem('pickems_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('pickems_token');
    if (token) {
      api.me().then(setUser).catch(() => localStorage.removeItem('pickems_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const { token, user } = await api.login(username, password);
    localStorage.setItem('pickems_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('pickems_token');
    setUser(null);
  };

  const setTheme = (t) => {
    localStorage.setItem('pickems_theme', t);
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
