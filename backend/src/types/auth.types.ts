/**
 * NBG OAuth Authentication Types
 */

import { Request } from 'express';

export interface NBGTokenPayload {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  role?: string | string[];
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  nonce?: string;
  sid?: string;
  auth_time?: number;
  idp?: string;
  amr?: string[];
  [key: string]: any; // Additional custom claims
}

export interface NBGUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  role?: string | string[];
  preferred_username?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  auth?: NBGTokenPayload;
  user?: NBGUserInfo;
  token?: string;
}

export interface NBGOAuthConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string[];
  jwksUri?: string;
  tokenEndpoint?: string;
  authorizationEndpoint?: string;
  userInfoEndpoint?: string;
  introspectionEndpoint?: string;
  discoveryEndpoint?: string;
}

export interface TokenValidationOptions {
  validateIssuer?: boolean;
  validateAudience?: boolean;
  validateExpiry?: boolean;
  clockTolerance?: number;
  requiredClaims?: string[];
}

export interface PublicEndpointConfig {
  path: string;
  method?: string | string[];
  exact?: boolean;
}