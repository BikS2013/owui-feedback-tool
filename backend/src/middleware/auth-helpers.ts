/**
 * NBG OAuth Helper Functions
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, NBGUserInfo } from '../types/auth.types.js';
import { getNBGOAuthConfig, getPublicEndpoints, isAuthEnabled } from './nbg-auth.config.js';

/**
 * Fetch user info from NBG OAuth provider
 */
export async function fetchUserInfo(token: string): Promise<NBGUserInfo> {
  const config = getNBGOAuthConfig();
  
  const response = await fetch(config.userInfoEndpoint!, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Exchange reference token for JWT (NBG specific feature)
 */
export async function exchangeReferenceToken(
  referenceToken: string,
  scopes?: string[]
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const config = getNBGOAuthConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'exchange_reference_token',
    token: referenceToken,
    scope: scopes?.join(' ') || config.scopes.join(' ')
  });

  const response = await fetch(config.tokenEndpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Introspect token (validate with NBG server)
 */
export async function introspectToken(token: string): Promise<{
  active: boolean;
  sub?: string;
  exp?: number;
  [key: string]: any;
}> {
  const config = getNBGOAuthConfig();
  
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  const response = await fetch(config.introspectionEndpoint!, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: `token=${encodeURIComponent(token)}`
  });

  if (!response.ok) {
    throw new Error(`Token introspection failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if a request path is public (doesn't require auth)
 */
export function isPublicEndpoint(req: Request): boolean {
  const publicEndpoints = getPublicEndpoints();
  const path = req.path;

  return publicEndpoints.some(endpoint => {
    if (endpoint.exact) {
      return path === endpoint.path;
    } else {
      return path.startsWith(endpoint.path);
    }
  });
}

/**
 * Global auth middleware that checks if auth is required
 */
export function globalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth if globally disabled
  if (!isAuthEnabled()) {
    // Set a mock auth object to prevent issues in downstream code
    // This ensures routes that check req.auth will work properly
    req.auth = {
      sub: 'dev-user',
      name: 'Development User',
      email: 'dev@example.com',
      iss: 'development',
      aud: 'development',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };
    next();
    return;
  }

  // Skip auth for public endpoints
  if (isPublicEndpoint(req)) {
    next();
    return;
  }

  // Otherwise, require authentication
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ 
      error: 'Authentication required',
      hint: 'Please provide a Bearer token in the Authorization header'
    });
    return;
  }

  // Delegate to token validator
  next();
}

/**
 * Middleware to attach user info to request
 */
export function attachUserInfo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.auth || !req.token) {
    next();
    return;
  }

  // Fetch user info asynchronously
  fetchUserInfo(req.token)
    .then(userInfo => {
      req.user = userInfo;
      next();
    })
    .catch(error => {
      console.error('Failed to fetch user info:', error);
      // Continue without user info - auth is still valid
      next();
    });
}

/**
 * Get authorization URL for login
 */
export function getAuthorizationUrl(state?: string, nonce?: string): string {
  const config = getNBGOAuthConfig();
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    ...(state && { state }),
    ...(nonce && { nonce })
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Get logout URL
 */
export function getLogoutUrl(idTokenHint?: string, state?: string): string {
  const config = getNBGOAuthConfig();
  
  const params = new URLSearchParams({
    post_logout_redirect_uri: config.postLogoutRedirectUri,
    ...(idTokenHint && { id_token_hint: idTokenHint }),
    ...(state && { state })
  });

  return `${config.issuer}/connect/endsession?${params.toString()}`;
}