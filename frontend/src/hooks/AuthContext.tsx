import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  ready: boolean;
  acceptSession: (token: string, profile: UserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const logout = useCallback(() => {
    sessionStorage.removeItem('fairiot-token');
    setUser(null);
  }, []);
  const refreshProfile = useCallback(async () => {
    const token = sessionStorage.getItem('fairiot-token');
    if (!token) { setUser(null); return; }
    try {
      setUser(await api.get<UserProfile>('/auth/me'));
    } catch {
      logout();
    }
  }, [logout]);
  const acceptSession = useCallback((token: string, profile: UserProfile) => {
    sessionStorage.setItem('fairiot-token', token);
    setUser(profile);
  }, []);
  useEffect(() => {
    void refreshProfile().finally(() => setReady(true));
  }, [refreshProfile]);
  const value = useMemo(() => ({ user, ready, acceptSession, logout, refreshProfile }), [user, ready, acceptSession, logout, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
