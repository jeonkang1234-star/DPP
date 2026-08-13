import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services.js';
import { getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setStatus('anonymous');
      return () => {};
    }
    authApi
      .me()
      .then((me) => {
        if (!alive) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!alive) return;
        setToken(null);
        setStatus('anonymous');
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (provider) => {
    const { token, user: me } = await authApi.loginWithProvider(provider);
    setToken(token);
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, setUser, status, isAuthenticated: status === 'authenticated', login, logout }),
    [user, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
