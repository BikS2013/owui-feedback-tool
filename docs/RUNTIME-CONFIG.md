# Runtime Configuration

This document describes how the OWUI Feedback application supports runtime configuration for the API URL, allowing you to configure the backend endpoint when starting the Docker container instead of at build time.

## Overview

The application now supports runtime configuration through a combination of:
1. A dynamic `/config.json` endpoint served by nginx
2. Environment variable substitution at container startup
3. Asynchronous configuration loading in the React app

## How It Works

### 1. Container Startup
When the Docker container starts:
- The `API_URL` environment variable is read
- nginx's `envsubst` substitutes this value into the nginx configuration
- The `/config.json` endpoint is configured to return the runtime API URL

### 2. Application Loading
When the React application loads:
- It fetches `/config.json` from the nginx server
- If successful, it uses the runtime configuration
- If it fails (e.g., in development), it falls back to the build-time `VITE_API_URL`

### 3. API Calls
All API services now:
- Load the configuration asynchronously
- Cache the configuration to avoid multiple fetches
- Use the runtime-configured API URL for all requests

## Usage

### Docker Run
```bash
# Run with custom API URL
docker run -e API_URL=https://api.production.com -p 8080:80 owui-feedback

# Run with default API URL (http://localhost:3001)
docker run -p 8080:80 owui-feedback
```

### Docker Compose
```yaml
services:
  owui-feedback:
    image: owui-feedback:latest
    environment:
      - API_URL=http://backend:3001/api
    ports:
      - "8080:80"
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: owui-feedback
        image: owui-feedback:latest
        env:
        - name: API_URL
          value: "https://api.production.com"
```

## Development

In development mode (`npm run dev`):
- The `/config.json` endpoint won't exist
- The app will fall back to using `VITE_API_URL` from `.env`
- This ensures backward compatibility with existing development workflows

## Testing Runtime Configuration

To test the runtime configuration locally:

1. Build the Docker image:
   ```bash
   npm run docker:build
   ```

2. Run with different API URLs:
   ```bash
   # Test with local backend
   docker run -e API_URL=http://host.docker.internal:3001/api -p 8080:80 owui-feedback
   
   # Test with production backend
   docker run -e API_URL=https://api.example.com -p 8080:80 owui-feedback
   ```

3. Verify the configuration:
   - Open the app at http://localhost:8080
   - Check the browser's Network tab for the `/config.json` request
   - Verify API calls are going to the configured URL

## Implementation Details

### Files Modified

1. **src/utils/configLoader.ts** - New utility for loading runtime configuration
2. **src/utils/storageUtils.ts** - Updated to support async configuration loading
3. **src/services/api.service.ts** - Updated to use async configuration
4. **src/services/llm.service.ts** - Updated to use async configuration
5. **nginx.conf.template** - New template with config.json endpoint
6. **Dockerfile** - Updated to support envsubst and runtime configuration
7. **docker-compose.yml** - Updated to use API_URL instead of VITE_API_URL

### Backward Compatibility

The implementation maintains full backward compatibility:
- Existing `.env` files continue to work in development
- Build-time configuration still works as a fallback
- No changes required for developers not using Docker

## Troubleshooting

### Config Not Loading
If the runtime configuration isn't loading:
1. Check the browser console for errors
2. Verify the `/config.json` endpoint returns valid JSON
3. Ensure the `API_URL` environment variable is set correctly

### API Calls Failing
If API calls are failing:
1. Check the Settings modal to see the configured API URL
2. Verify the backend is accessible from the container
3. Check for CORS issues if the backend is on a different domain