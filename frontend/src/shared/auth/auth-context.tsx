import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'GROUP_ADMIN' | 'SUPER_ADMIN';
  tenant: {
    id: string;
    name: string;
    slug: string;
    isRoot: boolean;
    accessAllAreas: boolean;
    theme: string;
  };
  allowedAreaIds: string[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function errorMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { message?: string };
    return payload.message || fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error('Sitzung konnte nicht geprüft werden.');
      const payload = await response.json() as { user: AuthUser };
      setUser(payload.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe: true })
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Anmeldung nicht möglich.'));
    }
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Das Passwort konnte nicht geändert werden.'));
    }
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, login, logout, changePassword, refresh }), [
    user,
    loading,
    login,
    logout,
    changePassword,
    refresh
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
