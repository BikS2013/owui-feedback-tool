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
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(0);

  const checkAuth = useCallback(async () => {
    console.log('🔍 [AuthContext] checkAuth function called');
    // Don't set loading to true for background checks to avoid re-renders
    const isInitialCheck = authStatus === null;
    if (isInitialCheck) {
      setLoading(true);
    }
    
    try {
      console.log('📡 [AuthContext] Calling AuthService.checkAuthStatus()');
      const status = await AuthService.checkAuthStatus();
      
      // Only update state if authentication status has changed
      const wasAuthenticated = authStatus?.authenticated;
      const isAuthenticated = status.authenticated;
      
      console.log('🔐 [AuthContext] Auth check:', {
        wasAuthenticated,
        isAuthenticated,
        isInitialCheck,
        willUpdateState: isInitialCheck || wasAuthenticated !== isAuthenticated
      });
      
      // Only trigger re-render if:
      // 1. This is the initial check (authStatus was null)
      // 2. User went from authenticated to unauthenticated
      // 3. User went from unauthenticated to authenticated
      if (isInitialCheck || wasAuthenticated !== isAuthenticated) {
        console.log('🔄 [AuthContext] Updating auth state - will trigger re-render');
        setAuthStatus(status);
        setError(null);
        
        if (status.authenticated && status.user) {
          setUser(status.user);
        } else {
          setUser(null);
        }
      } else {
        console.log('✅ [AuthContext] Auth status unchanged - skipping state update');
      }
      
      // Always update last auth check timestamp
      setLastAuthCheck(Date.now());
    } catch (err) {
      console.error('Auth check failed:', err);
      // Only update state if user was previously authenticated
      if (authStatus?.authenticated) {
        setError('Failed to check authentication status');
        setAuthStatus(null);
        setUser(null);
      }
    } finally {
      if (isInitialCheck) {
        setLoading(false);
      }
    }
  }, [authStatus]);

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
    console.log('🚀 [AuthContext] Mounting - initiating auth check');
    checkAuth();
    
    // Setup auth interceptor
    AuthService.setupInterceptor();
  }, [checkAuth]);

  // Check auth status when window gains focus (but only if 5 minutes have passed)
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;
      
      // Only check auth if more than 5 minutes have passed since last check
      if (now - lastAuthCheck > fiveMinutesInMs) {
        console.log('Checking auth status on focus (5+ minutes since last check)');
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAuth, lastAuthCheck]);

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