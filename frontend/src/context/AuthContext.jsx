import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { tokenStore } from '../services/api';

const AuthContext = createContext();

// Refresh the access token 2 minutes before it expires (access token = 15m → refresh at 13m)
const ACCESS_TTL_MS       = 15 * 60 * 1000;  // 15 minutes
const PROACTIVE_REFRESH_MS = ACCESS_TTL_MS - 2 * 60 * 1000;  // 13 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const refreshTimerRef = useRef(null);

  // ─── Proactive silent refresh ───────────────────────────────────────────────
  function scheduleProactiveRefresh() {
    clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(async () => {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return;

      try {
        const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
        if (res.data.access_token) {
          tokenStore.setAccess(res.data.access_token);
          tokenStore.setRefresh(res.data.refresh_token);
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
          // Schedule next refresh
          scheduleProactiveRefresh();
        }
      } catch {
        // Proactive refresh failed — api.js interceptor will handle the next 401
        clearTimeout(refreshTimerRef.current);
      }
    }, PROACTIVE_REFRESH_MS);
  }

  // ─── Session validation on mount ───────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenStore.getAccess();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          scheduleProactiveRefresh();
        }
      } catch {
        // Token invalid / expired — api.js interceptor already attempted refresh
        // If still failing, clear state
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    return () => clearTimeout(refreshTimerRef.current);
  }, []);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });

    if (res.data.success) {
      const { access_token, refresh_token, token, user: userData } = res.data;

      // Support both new field names and legacy "token" field
      tokenStore.setAccess(access_token || token);
      tokenStore.setRefresh(refresh_token || '');
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      scheduleProactiveRefresh();

      return userData;
    }

    throw new Error(res.data.message || 'Login failed');
  };

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    clearTimeout(refreshTimerRef.current);

    const refreshToken = tokenStore.getRefresh();

    // Fire-and-forget: tell server to revoke refresh token
    if (refreshToken) {
      api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
    }

    setUser(null);
    tokenStore.clear();
  };

  // ─── Logout from all devices ───────────────────────────────────────────────
  const logoutAll = async () => {
    clearTimeout(refreshTimerRef.current);

    try {
      await api.post('/auth/logout-all');
    } catch {
      // Best effort
    }

    setUser(null);
    tokenStore.clear();
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
