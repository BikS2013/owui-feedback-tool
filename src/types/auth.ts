/**
 * Authentication types for NBG OAuth integration
 */

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
  preferred_username?: string;
  [key: string]: any;
}

export interface AuthToken {
  issuer: string;
  audience: string | string[];
  expiresAt: string;
  issuedAt: string;
}

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
  user?: AuthUser;
  token?: AuthToken;
  message?: string;
}

export interface TokenResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  state?: string;
}

export interface LoginResponse {
  authUrl: string;
  state: string;
  nonce: string;
}

export interface LogoutResponse {
  logoutUrl: string;
  state: string;
}