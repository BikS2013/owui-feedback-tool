/**
 * Authentication service for NBG OAuth
 */

import { AuthStatus, LoginResponse, LogoutResponse, TokenResponse } from '../types/auth';
import { storageUtils } from '../utils/storageUtils';

const TOKEN_KEY = 'nbg_access_token';
const REFRESH_TOKEN_KEY = 'nbg_refresh_token';
const ID_TOKEN_KEY = 'nbg_id_token';

export class AuthService {
  private static tokenInterceptorAdded = false;

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored ID token
   */
  static getIdToken(): string | null {
    return localStorage.getItem(ID_TOKEN_KEY);
  }

  /**
   * Store tokens
   */
  static storeTokens(tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  }): void {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    if (tokens.id_token) {
      localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
    }
  }

  /**
   * Clear all tokens
   */
  static clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_nonce');
  }

  /**
   * Check authentication status
   */
  static async checkAuthStatus(): Promise<AuthStatus> {
    const apiUrl = await storageUtils.getApiUrl();
    const token = this.getAccessToken();

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/auth/status`, { headers });
      
      if (!response.ok) {
        throw new Error('Auth status check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Auth status check error:', error);
      return {
        enabled: false,
        authenticated: false,
        message: 'Unable to check authentication status'
      };
    }
  }

  /**
   * Initiate login flow
   */
  static async login(): Promise<LoginResponse> {
    const apiUrl = await storageUtils.getApiUrl();
    
    const response = await fetch(`${apiUrl}/auth/login`);
    
    if (!response.ok) {
      throw new Error('Failed to initiate login');
    }

    const data = await response.json();
    
    // Store state and nonce for security verification
    sessionStorage.setItem('oauth_state', data.state);
    sessionStorage.setItem('oauth_nonce', data.nonce);
    
    return data;
  }

  /**
   * Handle OAuth callback
   */
  static async handleCallback(queryParams: URLSearchParams): Promise<TokenResponse> {
    const apiUrl = await storageUtils.getApiUrl();
    
    // Verify state for CSRF protection
    const state = queryParams.get('state');
    const savedState = sessionStorage.getItem('oauth_state');
    
    if (state !== savedState) {
      throw new Error('Invalid state - possible CSRF attack');
    }

    const response = await fetch(`${apiUrl}/auth/callback?${queryParams.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    const tokens = await response.json();
    
    if (tokens.success) {
      this.storeTokens(tokens);
      // Clean up session storage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_nonce');
    }
    
    return tokens;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return false;
    }

    try {
      const apiUrl = await storageUtils.getApiUrl();
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();
      this.storeTokens(tokens);
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Initiate logout flow
   */
  static async logout(): Promise<LogoutResponse> {
    const apiUrl = await storageUtils.getApiUrl();
    const idToken = this.getIdToken();
    
    const url = new URL(`${apiUrl}/auth/logout`);
    if (idToken) {
      url.searchParams.append('id_token', idToken);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('Failed to initiate logout');
    }

    const data = await response.json();
    
    // Clear tokens immediately
    this.clearTokens();
    
    return data;
  }

  /**
   * Add authentication header to a request configuration
   */
  static addAuthHeader(config: RequestInit = {}): RequestInit {
    const token = this.getAccessToken();
    
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    return config;
  }

  /**
   * Setup global fetch interceptor for authentication
   */
  static setupInterceptor(): void {
    if (this.tokenInterceptorAdded) {
      return;
    }

    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Only add auth header to API calls
      const url = typeof input === 'string' ? input : input.toString();
      const apiUrl = await storageUtils.getApiUrl();
      
      if (url.startsWith(apiUrl)) {
        init = this.addAuthHeader(init);
      }
      
      let response = await originalFetch(input, init);
      
      // Handle 401 responses by trying to refresh token
      if (response.status === 401 && url.startsWith(apiUrl)) {
        const refreshed = await this.refreshToken();
        
        if (refreshed) {
          // Retry the original request with new token
          init = this.addAuthHeader(init);
          response = await originalFetch(input, init);
        } else {
          // Refresh failed, redirect to login
          window.location.href = '/login';
        }
      }
      
      return response;
    };
    
    this.tokenInterceptorAdded = true;
  }
}