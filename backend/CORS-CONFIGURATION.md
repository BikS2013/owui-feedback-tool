# CORS Configuration Guide

## Overview
Cross-Origin Resource Sharing (CORS) configuration is essential when the frontend and backend are served from different origins (different protocol, domain, or port).

## Current Configuration
The backend server now supports multiple origins configuration through environment variables in `src/index.ts`.

## Configuration Methods

### Method 1: Multiple Origins (Recommended)
Configure multiple origins using the `CORS_ORIGINS` environment variable in `.env`:

```bash
# Multiple origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://your-domain.com

# Single origin (backward compatible)
CORS_ORIGIN=http://localhost:5173

# Allow all origins (use with caution)
CORS_ORIGINS=*
```

The server automatically parses comma-separated values and configures CORS accordingly.

### Method 2: Single Origin (Backward Compatible)
For backward compatibility, you can still use the single origin approach:

```bash
CORS_ORIGIN=http://localhost:5173
```

The server will automatically use this if `CORS_ORIGINS` is not set.

### Method 3: Allow All Origins (Development Only)
⚠️ **Warning**: This is not recommended for production!

```bash
CORS_ORIGINS=*
```

Note: When using wildcard with credentials, the server will dynamically allow the requesting origin.

### Method 4: Dynamic Origin Based on Environment
```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN 
    : true,  // Allow all in development
  credentials: true
};

app.use(cors(corsOptions));
```

## Advanced CORS Configuration

### Full CORS Options
```typescript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
}));
```

### Configuration Options Explained:
- **origin**: Configures the Access-Control-Allow-Origin header
- **credentials**: Configures the Access-Control-Allow-Credentials header
- **methods**: Configures the Access-Control-Allow-Methods header
- **allowedHeaders**: Configures the Access-Control-Allow-Headers header
- **exposedHeaders**: Configures the Access-Control-Expose-Headers header
- **maxAge**: Configures the Access-Control-Max-Age header (preflight cache)

## Troubleshooting CORS Issues

### 1. Check Browser Console
Look for errors like:
```
Access to fetch at 'http://localhost:3001/api/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

### 2. Verify Headers
Use browser DevTools Network tab to check response headers:
- `Access-Control-Allow-Origin` should match your frontend origin
- `Access-Control-Allow-Credentials` should be `true` if using credentials

### 3. Common Issues and Solutions

**Issue**: "The CORS protocol does not allow specifying a wildcard (any) origin and credentials at the same time"
**Solution**: Use specific origin instead of '*' when credentials: true

**Issue**: Preflight requests failing
**Solution**: Ensure OPTIONS method is allowed and proper headers are configured

**Issue**: Cookies not being sent
**Solution**: 
- Ensure `credentials: true` in CORS config
- Frontend fetch must include `credentials: 'include'`
- Both frontend and backend must use HTTPS in production

### 4. Testing CORS
Test with curl:
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     --verbose \
     http://localhost:3001/api/health
```

## Docker Configuration
When using Docker, ensure the CORS origin matches the actual URL users will access:

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - CORS_ORIGIN=http://localhost:8080  # Or your Docker frontend URL
```

## Production Checklist
- [ ] Use specific origins, not wildcards
- [ ] Use HTTPS for both frontend and backend
- [ ] Set appropriate `maxAge` to reduce preflight requests
- [ ] Only expose necessary headers
- [ ] Validate origin against a whitelist
- [ ] Monitor CORS errors in production logs