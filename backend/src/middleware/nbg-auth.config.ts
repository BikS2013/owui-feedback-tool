/**
 * NBG OAuth Configuration
 */

import { NBGOAuthConfig, PublicEndpointConfig } from '../types/auth.types.js';

/**
 * Get NBG OAuth configuration from environment variables
 */
export function getNBGOAuthConfig(): NBGOAuthConfig {
  const issuer = process.env.NBG_OAUTH_ISSUER;
  const clientId = process.env.NBG_CLIENT_ID;
  const clientSecret = process.env.NBG_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

  // If auth is disabled, return a mock config to prevent errors
  if (!isAuthEnabled()) {
    return {
      issuer: 'http://localhost',
      clientId: 'mock-client',
      clientSecret: 'mock-secret',
      redirectUri: `${baseUrl}/signin-nbg`,
      postLogoutRedirectUri: `${baseUrl}/signout-callback-nbg`,
      scopes: ['openid', 'profile', 'email'],
      jwksUri: 'http://localhost/.well-known/jwks.json',
      tokenEndpoint: 'http://localhost/connect/token',
      authorizationEndpoint: 'http://localhost/connect/authorize',
      userInfoEndpoint: 'http://localhost/connect/userinfo',
      introspectionEndpoint: 'http://localhost/connect/introspect',
      discoveryEndpoint: 'http://localhost/.well-known/openid-configuration'
    };
  }

  if (!issuer || !clientId || !clientSecret) {
    throw new Error('NBG OAuth configuration missing. Please set NBG_OAUTH_ISSUER, NBG_CLIENT_ID, and NBG_CLIENT_SECRET environment variables.');
  }

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/signin-nbg`,
    postLogoutRedirectUri: `${baseUrl}/signout-callback-nbg`,
    scopes: (process.env.NBG_OAUTH_SCOPES || 'openid profile email').split(' '),
    jwksUri: `${issuer}/.well-known/jwks.json`,
    tokenEndpoint: `${issuer}/connect/token`,
    authorizationEndpoint: `${issuer}/connect/authorize`,
    userInfoEndpoint: `${issuer}/connect/userinfo`,
    introspectionEndpoint: `${issuer}/connect/introspect`,
    discoveryEndpoint: `${issuer}/.well-known/openid-configuration`
  };
}

/**
 * Get public endpoints that don't require authentication
 */
export function getPublicEndpoints(): PublicEndpointConfig[] {
  const defaultPublicEndpoints: PublicEndpointConfig[] = [
    { path: '/health', exact: true },
    { path: '/api-docs', exact: false },
    { path: '/signin-nbg', exact: true },
    { path: '/signout-callback-nbg', exact: true },
    { path: '/api/auth', exact: false } // Auth endpoints themselves
  ];

  // Add custom public endpoints from environment
  const customEndpoints = process.env.PUBLIC_ENDPOINTS || '';
  if (customEndpoints) {
    const endpoints = customEndpoints.split(',').map(endpoint => ({
      path: endpoint.trim(),
      exact: true
    }));
    defaultPublicEndpoints.push(...endpoints);
  }

  return defaultPublicEndpoints;
}

/**
 * Check if authentication is globally enabled
 */
export function isAuthEnabled(): boolean {
  return process.env.NBG_OAUTH_ENABLED !== 'false';
}

/**
 * Get token validation options
 */
export function getTokenValidationOptions() {
  return {
    validateIssuer: process.env.NBG_VALIDATE_ISSUER !== 'false',
    validateAudience: process.env.NBG_VALIDATE_AUDIENCE !== 'false',
    validateExpiry: process.env.NBG_VALIDATE_EXPIRY !== 'false',
    clockTolerance: parseInt(process.env.NBG_CLOCK_TOLERANCE || '5', 10),
    requiredClaims: process.env.NBG_REQUIRED_CLAIMS?.split(',') || ['sub']
  };
}