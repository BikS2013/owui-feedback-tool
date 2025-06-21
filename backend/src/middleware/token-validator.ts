/**
 * NBG OAuth Token Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthenticatedRequest, NBGTokenPayload } from '../types/auth.types.js';
import { getNBGOAuthConfig, getTokenValidationOptions, isAuthEnabled } from './nbg-auth.config.js';

// Create JWKS client for key retrieval
let jwksClientInstance: jwksClient.JwksClient | null = null;

function getJwksClient(): jwksClient.JwksClient {
  if (!jwksClientInstance) {
    const config = getNBGOAuthConfig();
    jwksClientInstance = jwksClient({
      jwksUri: config.jwksUri!,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }
  return jwksClientInstance;
}

/**
 * Get signing key from JWKS
 */
async function getSigningKey(kid: string): Promise<string> {
  const client = getJwksClient();
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

/**
 * Validate NBG OAuth token
 */
export async function validateNBGToken(
  token: string,
  options = getTokenValidationOptions()
): Promise<NBGTokenPayload> {
  const config = getNBGOAuthConfig();
  
  // Decode token header to get key ID
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) {
    throw new Error('Token missing key ID');
  }

  // Get signing key from JWKS
  const signingKey = await getSigningKey(kid);

  // Verify token
  const verifyOptions: jwt.VerifyOptions = {
    algorithms: ['RS256'],
    clockTolerance: options.clockTolerance
  };

  if (options.validateIssuer) {
    verifyOptions.issuer = config.issuer;
  }

  if (options.validateAudience && config.clientId) {
    verifyOptions.audience = config.clientId;
  }

  const payload = jwt.verify(token, signingKey, verifyOptions) as NBGTokenPayload;

  // Additional validation
  if (options.requiredClaims) {
    for (const claim of options.requiredClaims) {
      if (!payload[claim]) {
        throw new Error(`Required claim '${claim}' missing from token`);
      }
    }
  }

  return payload;
}

/**
 * Express middleware for token validation
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // If auth is globally disabled, skip validation
  if (!isAuthEnabled()) {
    // Set a mock auth object to prevent issues in downstream code
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

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header missing' });
    return;
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization header format' });
    return;
  }

  validateNBGToken(token)
    .then(payload => {
      req.auth = payload;
      req.token = token;
      next();
    })
    .catch(error => {
      console.error('Token validation error:', error);
      res.status(401).json({ 
        error: 'Invalid token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
}

/**
 * Optional auth middleware - validates token if present but doesn't require it
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // If auth is globally disabled, set mock auth and continue
  if (!isAuthEnabled()) {
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

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No auth header, continue without auth
    next();
    return;
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    // Invalid format, continue without auth
    next();
    return;
  }

  validateNBGToken(token)
    .then(payload => {
      req.auth = payload;
      req.token = token;
      next();
    })
    .catch(() => {
      // Token validation failed, continue without auth
      next();
    });
}

/**
 * Middleware to check for specific roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If auth is globally disabled, skip role validation
    if (!isAuthEnabled()) {
      next();
      return;
    }

    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoles = Array.isArray(req.auth.role) 
      ? req.auth.role 
      : req.auth.role 
        ? [req.auth.role] 
        : [];

    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRoles
      });
      return;
    }

    next();
  };
}