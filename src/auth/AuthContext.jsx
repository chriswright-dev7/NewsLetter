import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

// Holds the logged-in user, the viewer's access tier, and tier/plan metadata.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState({ tiers: [], plans: [], viewer: null });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // Re-reads the session and metadata (call after login, plan changes, admin edits).
  const refresh = useCallback(async () => {
    const me = await api.me();
    setUser(me?.user ?? null);
    setMeta(await api.getMeta());
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message || 'Could not reach the newsletter server'))
      .finally(() => setReady(true));
  }, [refresh]);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    await refresh();
    return u;
  };

  const signup = async (fields) => {
    const u = await api.signup(fields);
    await refresh();
    return u;
  };

  const logout = async () => {
    await api.logout();
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        viewer: meta.viewer,
        tiers: meta.tiers,
        plans: meta.plans,
        ready,
        error,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
