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
    // Wait for config to load to get proper API URL
    console.log('⏳ [AuthService] Waiting for API URL configuration...');
    const apiUrl = await storageUtils.getApiUrl();
    console.log('✅ [AuthService] API URL loaded:', apiUrl);
    const token = this.getAccessToken();

    try {
      console.log('🔍 [AuthService] Checking auth status at:', `${apiUrl}/api/auth/status`);
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${apiUrl}/api/auth/status`, { 
        headers,
        signal: controller.signal,
        credentials: 'include' // Include cookies for CORS
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('❌ [AuthService] Auth status check failed with status:', response.status);
        throw new Error(`Auth status check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [AuthService] Auth status response:', data);
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('⏱️ [AuthService] Auth status check timed out');
        return {
          enabled: false,
          authenticated: false,
          message: 'Authentication check timed out'
        };
      }
      console.error('❌ [AuthService] Auth status check error:', error);
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
    
    const response = await fetch(`${apiUrl}/api/auth/login`);
    
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

    const response = await fetch(`${apiUrl}/api/auth/callback?${queryParams.toString()}`);
    
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
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
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
    
    const url = new URL(`${apiUrl}/api/auth/logout`);
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
      // Get the URL from the input
      let url: string;
      if (input instanceof Request) {
        url = input.url;
      } else if (input instanceof URL) {
        url = input.toString();
      } else {
        url = input.toString();
      }
      
      // Detailed API URL construction logging
      console.log('🔧 [Auth Interceptor] Processing fetch request:');
      console.log('  📍 Original URL:', url);
      
      // Get the base API URL
      const apiUrl = storageUtils.getApiUrlSync(); // Use sync version to avoid deadlock
      console.log('  🏠 API Base URL from config:', apiUrl || '(empty - config not loaded)');
      
      // Check if this is a relative API path
      if (url.startsWith('/api/')) {
        console.log('  ⚠️ Relative API path detected:', url);
        
        if (!apiUrl) {
          console.error('  ❌ Cannot construct full URL - API base URL is empty!');
          console.log('  💡 This happens when config hasn\'t loaded yet');
          console.log('  💡 The request will go to:', window.location.origin + url);
          console.log('  🔧 Attempting to load API URL async...');
          
          // Try to load the API URL async before proceeding
          try {
            const asyncApiUrl = await storageUtils.getApiUrl();
            if (asyncApiUrl) {
              const fullUrl = asyncApiUrl + url;
              console.log('  ✅ Async API URL loaded:', asyncApiUrl);
              console.log('  🔗 Constructing full URL:', fullUrl);
              url = fullUrl;
              input = url; // Update the input with the full URL
            }
          } catch (error) {
            console.error('  ❌ Failed to load API URL async:', error);
          }
        } else {
          // Construct the full URL
          const fullUrl = apiUrl + url;
          console.log('  ✅ Full URL will be:', fullUrl);
          console.log('  🔧 Updating request URL from', url, 'to', fullUrl);
          url = fullUrl;
          input = url; // Update the input with the full URL
        }
      } else if (url.startsWith('http')) {
        console.log('  ✅ Absolute URL, no modification needed');
      }
      
      // Check if we should add auth header
      if (apiUrl && url.startsWith(apiUrl)) {
        console.log('  🔐 Adding auth header to API request');
        init = this.addAuthHeader(init);
      } else {
        console.log('  🔓 Not adding auth header (not an API request or API URL not loaded)');
      }
      
      console.log('  🚀 Final fetch URL:', url);
      
      // Use the modified URL instead of the original input
      let response = await originalFetch(url, init);
      
      // Handle 401 responses by trying to refresh token
      if (response.status === 401 && apiUrl && url.startsWith(apiUrl)) {
        console.log('  🔄 Got 401, attempting token refresh...');
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