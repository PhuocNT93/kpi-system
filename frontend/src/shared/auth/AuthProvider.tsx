import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { authApi } from '../api/auth-api';
import { setAccessToken } from '../api/api-client';
import type { AuthUser, UserRole } from './auth-models';
import { LoadingSpinner } from '../components/ui';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export { ApiClientError } from '../api/api-client';

const AUTH_STORAGE_KEY = 'kpi_auth_user';
const TOKEN_STORAGE_KEY = 'kpi_auth_token';

// Lightweight JWT payload decode (no verification — backend is authoritative)
function extractRoleFromToken(token: string): UserRole | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedUser && storedToken) {
      setAccessToken(storedToken);
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initializing is complete after first mount check
    setIsInitializing(false);
  }, []);

  const applyLoginResult = useCallback((result: Awaited<ReturnType<typeof authApi.login>>) => {
    setAccessToken(result.accessToken);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.accessToken);
    
    // Extracted role from token or defaults
    const role: UserRole = extractRoleFromToken(result.accessToken) ?? 'EMPLOYEE';
    const authUser: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role,
    };
    
    setUser(authUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    applyLoginResult(await authApi.login({ email, password }));
  }, [applyLoginResult]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    applyLoginResult(await authApi.loginWithGoogle({ id_token: idToken }));
  }, [applyLoginResult]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, loginWithGoogle, logout }),
    [user, login, loginWithGoogle, logout],
  );

  if (isInitializing) {
    return <LoadingSpinner label="Loading session..." />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
