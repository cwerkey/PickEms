import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pickems_token');
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('pickems_token'))
        .finally(() => setLoading(false));
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);