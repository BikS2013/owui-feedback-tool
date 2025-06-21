# NBG OAuth Implementation Guide

This guide explains how to use the NBG OAuth authentication system that has been implemented for the backend.

## Overview

The NBG OAuth implementation follows the OpenID Connect Authorization Code flow with specific requirements from NBG's Identity Server.

## Key Features

- ✅ JWT token validation with JWKS
- ✅ Automatic token refresh support
- ✅ Reference token exchange (NBG specific)
- ✅ Role-based access control (RBAC)
- ✅ Configurable public endpoints
- ✅ Optional authentication for mixed access
- ✅ User info endpoint integration
- ✅ Development mode (auth can be disabled)

## File Structure

```
backend/src/
├── middleware/
│   ├── nbg-auth.config.ts      # Configuration management
│   ├── token-validator.ts      # JWT validation middleware
│   ├── auth-helpers.ts         # OAuth helper functions
│   └── auth-integration.example.ts  # Integration examples
├── routes/
│   └── auth.routes.ts          # Authentication endpoints
└── types/
    └── auth.types.ts           # TypeScript interfaces
```

## Configuration

### Required Environment Variables

```env
# NBG OAuth Configuration
NBG_OAUTH_ENABLED=true
NBG_OAUTH_ISSUER=https://identity.nbg.gr  # NBG Identity Server URL
NBG_CLIENT_ID=your-client-id              # From NBG Identity Team
NBG_CLIENT_SECRET=your-client-secret      # From NBG Identity Team
NBG_OAUTH_SCOPES=openid profile email api1
BASE_URL=http://localhost:3001

# Optional Configuration
PUBLIC_ENDPOINTS=/api/health,/api/status  # Additional public endpoints
NBG_VALIDATE_ISSUER=true
NBG_VALIDATE_AUDIENCE=true
NBG_VALIDATE_EXPIRY=true
NBG_CLOCK_TOLERANCE=5
NBG_REQUIRED_CLAIMS=sub
```

### Getting Started

1. **Contact NBG Identity Team** (ids.tech@nbg.gr) to:
   - Request a new client registration
   - Get your ClientId and ClientSecret
   - Register your callback URLs:
     - `https://your-domain/signin-nbg`
     - `https://your-domain/signout-callback-nbg`

2. **Install Dependencies** (already done):
   ```bash
   npm install jsonwebtoken jwks-rsa
   npm install --save-dev @types/jsonwebtoken
   ```

3. **Update Your index.ts**:
   ```typescript
   import authRouter from './routes/auth.routes.js';
   import { globalAuthMiddleware } from './middleware/auth-helpers.js';
   import { requireAuth } from './middleware/token-validator.js';

   // Add auth routes
   app.use('/api/auth', authRouter);

   // Add NBG callback routes
   app.get('/signin-nbg', (req, res) => {
     res.redirect(`/api/auth/callback?${req.url.split('?')[1]}`);
   });
   app.get('/signout-callback-nbg', (req, res) => {
     res.redirect(`/api/auth/logout-callback?${req.url.split('?')[1]}`);
   });

   // Apply global auth check
   app.use(globalAuthMiddleware);

   // Protect your routes
   app.use('/api/export', requireAuth, exportRouter);
   app.use('/api/agent', requireAuth, agentRouter);
   app.use('/api/llm', requireAuth, llmRouter);
   ```

## Authentication Endpoints

### `/api/auth/status`
Check authentication status and get user info.

**Response:**
```json
{
  "enabled": true,
  "authenticated": true,
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["user", "admin"]
  },
  "token": {
    "issuer": "https://identity.nbg.gr",
    "expiresAt": "2024-01-20T15:30:00Z"
  }
}
```

### `/api/auth/login`
Initiate the login flow.

**Response:**
```json
{
  "authUrl": "https://identity.nbg.gr/connect/authorize?...",
  "state": "uuid-for-csrf-protection",
  "nonce": "uuid-for-replay-protection"
}
```

### `/api/auth/refresh`
Refresh an expired access token.

**Request:**
```json
{
  "refresh_token": "your-refresh-token"
}
```

### `/api/auth/exchange-token`
Exchange NBG reference token for JWT (NBG specific feature).

**Request:**
```json
{
  "token": "reference-token",
  "scopes": ["api1", "api2"]
}
```

## Using Authentication in Routes

### Basic Protection
```typescript
import { requireAuth } from './middleware/token-validator.js';

// Require authentication
app.get('/api/protected', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.sub;
  res.json({ message: `Hello user ${userId}` });
});
```

### Optional Authentication
```typescript
import { optionalAuth } from './middleware/token-validator.js';

// Works with or without auth
app.get('/api/mixed', optionalAuth, (req: AuthenticatedRequest, res) => {
  if (req.auth) {
    res.json({ message: `Hello ${req.auth.name}` });
  } else {
    res.json({ message: 'Hello anonymous' });
  }
});
```

### Role-Based Access
```typescript
import { requireAuth, requireRole } from './middleware/token-validator.js';

// Require specific role
app.get('/api/admin', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Multiple roles (user must have at least one)
app.get('/api/moderator', requireAuth, requireRole('admin', 'moderator'), (req, res) => {
  res.json({ message: 'Moderator access granted' });
});
```

## Frontend Integration

The frontend needs to:

1. **Initiate Login**:
   ```javascript
   const response = await fetch('/api/auth/login');
   const { authUrl } = await response.json();
   window.location.href = authUrl;  // Redirect to NBG
   ```

2. **Handle Callback**:
   After NBG authentication, the user is redirected to `/signin-nbg` with tokens.

3. **Include Token in Requests**:
   ```javascript
   fetch('/api/protected', {
     headers: {
       'Authorization': `Bearer ${accessToken}`
     }
   });
   ```

4. **Refresh Token**:
   ```javascript
   const response = await fetch('/api/auth/refresh', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ refresh_token })
   });
   ```

## Public Endpoints

By default, these endpoints don't require authentication:
- `/health`
- `/api-docs`
- `/signin-nbg`
- `/signout-callback-nbg`
- `/api/auth/*`
- Any endpoints listed in `PUBLIC_ENDPOINTS` env variable

## Development Mode

To disable authentication during development:
```env
NBG_OAUTH_ENABLED=false
```

This allows all requests through without authentication.

## Troubleshooting

### Common Issues

1. **"NBG OAuth configuration missing"**
   - Ensure all required environment variables are set
   - Check that `.env` file is loaded properly

2. **"Invalid token format"**
   - Ensure the Authorization header format is: `Bearer <token>`
   - Check that the token is a valid JWT

3. **"Token missing key ID"**
   - The token might be malformed or from a different issuer
   - Verify the token is from NBG Identity Server

4. **401 Unauthorized on protected routes**
   - Check if the token has expired
   - Verify the token includes required claims
   - Ensure the JWKS endpoint is accessible

### Debug Mode

In development, error details are included in responses:
```json
{
  "error": "Invalid token",
  "details": "Token expired"
}
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (HttpOnly cookies recommended)
3. **Implement CSRF protection** for state parameter
4. **Validate all token claims** including issuer and audience
5. **Use short token expiry** with refresh token rotation
6. **Log authentication events** for audit trail
7. **Implement rate limiting** on auth endpoints

## Next Steps

1. Update your `index.ts` to integrate the auth middleware
2. Configure environment variables with NBG credentials
3. Test authentication flow with NBG Identity Server
4. Update frontend to handle OAuth flow
5. Implement proper session management if needed