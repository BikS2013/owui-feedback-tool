/**
 * Authentication context for NBG OAuth
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthStatus, AuthUser } from '../types/auth';
import { AuthService } from '../services/auth.service';

interface AuthContextType {
  authStatus: AuthStatus | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await AuthService.checkAuthStatus();
      setAuthStatus(status);
      
      if (status.authenticated && status.user) {
        setUser(status.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Failed to check authentication status');
      setAuthStatus(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    setError(null);
    
    try {
      const { authUrl } = await AuthService.login();
      // Redirect to NBG OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to initiate login');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    
    try {
      const { logoutUrl } = await AuthService.logout();
      // Clear local state
      setUser(null);
      setAuthStatus(null);
      // Redirect to NBG logout
      window.location.href = logoutUrl;
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to logout');
      // Even if logout fails, clear local state
      setUser(null);
      setAuthStatus(null);
      AuthService.clearTokens();
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
    
    // Setup auth interceptor
    AuthService.setupInterceptor();
  }, [checkAuth]);

  // Check auth status when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAuth]);

  const isAuthenticated = Boolean(authStatus?.authenticated && user);

  const value: AuthContextType = {
    authStatus,
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    isAuthenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};