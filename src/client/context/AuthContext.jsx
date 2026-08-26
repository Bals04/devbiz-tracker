import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me').then(setSession).catch(() => setSession(null)).finally(() => setLoading(false));
  }, []);

  const signIn = async (code) => {
    const data = await api('/auth/access', { method: 'POST', body: JSON.stringify({ code }) });
    setSession(data);
  };
  const signOut = async () => {
    await api('/auth/logout', { method: 'POST' });
    setSession(null);
  };
  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
