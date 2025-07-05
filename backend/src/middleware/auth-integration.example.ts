/**
 * Example: How to integrate NBG OAuth into your Express application
 * 
 * This file shows how to add NBG OAuth protection to your backend.
 * Copy the relevant parts to your index.ts file.
 */

import express from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { globalAuthMiddleware, isPublicEndpoint } from './auth-helpers.js';
import { requireAuth, optionalAuth, requireRole } from './token-validator.js';
import authRouter from '../routes/auth.routes.js';

// Import your existing routers
import { exportRoutes as exportRouter } from '../routes/export.routes.js';
import { agentRoutes as agentRouter } from '../routes/agent.routes.js';
import { llmRoutes as llmRouter } from '../routes/llm.routes.js';

const app = express();

// ===================================
// STEP 1: Add Auth Routes
// ===================================
// Add this BEFORE other routes to handle auth endpoints
app.use('/api/auth', authRouter);

// The auth router provides:
// GET  /api/auth/status - Check authentication status
// GET  /api/auth/login - Initiate login flow
// GET  /api/auth/callback - OAuth callback (mapped to /signin-nbg)
// GET  /api/auth/logout - Initiate logout flow
// GET  /api/auth/logout-callback - Logout callback (mapped to /signout-callback-nbg)
// POST /api/auth/refresh - Refresh access token
// POST /api/auth/exchange-token - Exchange reference token for JWT

// ===================================
// STEP 2: Add Global Auth Middleware
// ===================================
// This checks if auth is required based on endpoint and configuration
app.use(globalAuthMiddleware);

// ===================================
// STEP 3: Apply Auth to Protected Routes
// ===================================

// Option A: Protect entire routers
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/agent', requireAuth, agentRouter);
app.use('/api/llm', requireAuth, llmRouter);

// Option B: Protect individual endpoints
app.get('/api/sensitive-data', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'This is protected data',
    user: req.auth?.sub
  });
});

// Option C: Optional auth (works with or without token)
app.get('/api/public-or-private', optionalAuth, (req: AuthenticatedRequest, res) => {
  if (req.auth) {
    res.json({
      message: 'Welcome authenticated user',
      user: req.auth.sub
    });
  } else {
    res.json({
      message: 'Welcome anonymous user'
    });
  }
});

// Option D: Role-based access control
app.get('/api/admin-only', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Admin access granted',
    user: req.auth?.sub,
    roles: req.auth?.role
  });
});

// ===================================
// STEP 4: Handle NBG OAuth Callbacks
// ===================================
// NBG requires specific callback paths
app.get('/signin-nbg', (req, res) => {
  // Redirect to auth callback handler
  res.redirect(`/api/auth/callback?${req.url.split('?')[1]}`);
});

app.get('/signout-callback-nbg', (req, res) => {
  // Redirect to logout callback handler
  res.redirect(`/api/auth/logout-callback?${req.url.split('?')[1]}`);
});

// ===================================
// EXAMPLE: Accessing User Information
// ===================================
app.get('/api/user/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  // The authenticated user info is available in req.auth
  const userId = req.auth!.sub;
  const userName = req.auth!.name;
  const userEmail = req.auth!.email;
  const userRoles = req.auth!.role;

  res.json({
    id: userId,
    name: userName,
    email: userEmail,
    roles: userRoles,
    // Full token claims
    claims: req.auth
  });
});

// ===================================
// EXAMPLE: Conditional Logic Based on Auth
// ===================================
app.get('/api/data', optionalAuth, async (req: AuthenticatedRequest, res) => {
  let data;
  
  if (req.auth) {
    // User is authenticated - return personalized data
    data = await getPersonalizedData(req.auth.sub);
  } else {
    // User is not authenticated - return public data only
    data = await getPublicData();
  }
  
  res.json({ data });
});

// Helper functions for the example
async function getPersonalizedData(userId: string) {
  return { message: `Personalized data for user ${userId}` };
}

async function getPublicData() {
  return { message: 'Public data only' };
}

export default app;