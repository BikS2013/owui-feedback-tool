/**
 * NBG OAuth Authentication Routes
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { getNBGOAuthConfig, isAuthEnabled } from '../middleware/nbg-auth.config.js';
import { 
  getAuthorizationUrl, 
  getLogoutUrl, 
  exchangeReferenceToken,
  fetchUserInfo
} from '../middleware/auth-helpers.js';
import { optionalAuth } from '../middleware/token-validator.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Get authentication status and user info
 */
router.get('/status', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isAuthEnabled()) {
    res.json({
      enabled: false,
      authenticated: true,  // Always authenticated when auth is disabled
      message: 'Authentication is disabled',
      user: {
        id: 'dev-user',
        name: 'Development User',
        email: 'dev@example.com',
        roles: ['user', 'admin']  // Grant all roles in dev mode
      }
    });
    return;
  }

  if (!req.auth) {
    res.json({
      enabled: true,
      authenticated: false
    });
    return;
  }

  try {
    // Fetch full user info if we have a token
    let userInfo = null;
    if (req.token) {
      try {
        userInfo = await fetchUserInfo(req.token);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    }

    res.json({
      enabled: true,
      authenticated: true,
      user: {
        id: req.auth.sub,
        name: req.auth.name || userInfo?.name,
        email: req.auth.email || userInfo?.email,
        roles: req.auth.role || userInfo?.role,
        ...userInfo
      },
      token: {
        issuer: req.auth.iss,
        audience: req.auth.aud,
        expiresAt: new Date(req.auth.exp * 1000).toISOString(),
        issuedAt: new Date(req.auth.iat * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting auth status:', error);
    res.status(500).json({ error: 'Failed to get auth status' });
  }
});

/**
 * Initiate login flow
 */
router.get('/login', (req: Request, res: Response) => {
  if (!isAuthEnabled()) {
    res.status(400).json({ error: 'Authentication is disabled' });
    return;
  }

  try {
    // Generate state for CSRF protection
    const state = uuidv4();
    const nonce = uuidv4();
    
    // Store state in session or temporary storage
    // For now, we'll pass it through the query param
    // In production, use proper session management
    
    const authUrl = getAuthorizationUrl(state, nonce);
    
    // Return URL for frontend to redirect to
    res.json({
      authUrl,
      state,
      nonce
    });
  } catch (error) {
    console.error('Error initiating login:', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

/**
 * Handle OAuth callback (signin-nbg)
 * This endpoint is called by NBG after successful authentication
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.status(400).json({ 
      error: error as string, 
      description: error_description as string 
    });
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'Authorization code missing' });
    return;
  }

  try {
    const config = getNBGOAuthConfig();
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(config.tokenEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }).toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();
    
    // Return tokens to frontend
    // In production, you might want to:
    // 1. Store tokens securely (HttpOnly cookies)
    // 2. Redirect to frontend with success indicator
    // 3. Use server-side session management
    
    res.json({
      success: true,
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token,
      state: state as string
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Initiate logout flow
 */
router.get('/logout', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!isAuthEnabled()) {
    res.status(400).json({ error: 'Authentication is disabled' });
    return;
  }

  try {
    // Get ID token from request if available
    // In production, this might come from session storage
    const idTokenHint = req.query.id_token as string;
    const state = uuidv4();
    
    const logoutUrl = getLogoutUrl(idTokenHint, state);
    
    res.json({
      logoutUrl,
      state
    });
  } catch (error) {
    console.error('Error initiating logout:', error);
    res.status(500).json({ error: 'Failed to initiate logout' });
  }
});

/**
 * Handle logout callback (signout-callback-nbg)
 */
router.get('/logout-callback', (req: Request, res: Response) => {
  const { state } = req.query;
  
  // Clear any server-side session data
  // In production, implement proper session cleanup
  
  res.json({
    success: true,
    message: 'Logged out successfully',
    state: state as string
  });
});

/**
 * Exchange reference token for JWT (NBG specific)
 */
router.post('/exchange-token', optionalAuth, async (req: Request, res: Response) => {
  if (!isAuthEnabled()) {
    res.status(400).json({ error: 'Authentication is disabled' });
    return;
  }

  const { token, scopes } = req.body;
  
  if (!token) {
    res.status(400).json({ error: 'Reference token required' });
    return;
  }

  try {
    const result = await exchangeReferenceToken(token, scopes);
    res.json(result);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  if (!isAuthEnabled()) {
    res.status(400).json({ error: 'Authentication is disabled' });
    return;
  }

  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const config = getNBGOAuthConfig();
    
    const tokenResponse = await fetch(config.tokenEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: config.clientId,
        client_secret: config.clientSecret
      }).toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = await tokenResponse.json();
    res.json(tokens);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;