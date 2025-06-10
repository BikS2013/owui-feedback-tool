# Deployment Guide

This document serves as the central reference for all deployment options available for the OWUI Feedback application. It covers various deployment strategies, from development to production environments.

## Table of Contents
- [Development Deployment](#development-deployment)
- [Docker Deployment - Separate Containers](#docker-deployment---separate-containers)
- [Docker Deployment - Unified Container](#docker-deployment---unified-container)
- [Manual Deployment](#manual-deployment)
- [Environment Configuration](#environment-configuration)

## Development Deployment

For local development with hot reload:

```bash
# Frontend (default port 5173)
npm run dev

# Backend (separate terminal, port 3001)
cd backend
npm run dev
```

## Docker Deployment - Separate Containers

This approach uses Docker Compose to run frontend and backend in separate containers, providing better isolation and scalability.

### Quick Start
```bash
# Build and start all services
npm run docker:compose:up

# Or manually
docker-compose up --build
```

### Architecture
- **Frontend Container**: Nginx serving static React build on port 8080
- **Backend Container**: Node.js Express server on port 3001
- **Network**: Both containers communicate via `owui-network` bridge

### Configuration Files
- `docker-compose.yml`: Orchestrates both containers
- `Dockerfile`: Frontend container definition
- `backend/Dockerfile`: Backend container definition
- `nginx.conf`: Frontend nginx configuration

### Commands
```bash
npm run docker:compose:up     # Start services
npm run docker:compose:down   # Stop services
npm run docker:compose:build  # Rebuild images
```

## Docker Deployment - Unified Container

This approach combines both frontend and backend in a single Docker container, simplifying deployment and reducing resource usage.

### Overview
The unified deployment uses a single container running:
- **Nginx**: Serves frontend static files and proxies API requests
- **Node.js**: Runs the backend Express server
- **Supervisor**: Manages both nginx and Node.js processes

### Quick Start
```bash
# Using docker-compose
docker-compose -f docker-compose.unified.yml up --build

# Or build and run manually
docker build -f Dockerfile.unified -t owui-unified .
docker run -p 8080:80 \
  -v $(pwd)/backend/llm-config.yaml:/app/backend/llm-config.yaml:ro \
  owui-unified
```

### Architecture Details

#### Build Process (Multi-stage)
1. **Frontend Build Stage**: Compiles React application
2. **Backend Build Stage**: Compiles TypeScript backend
3. **Production Stage**: Combines both builds with runtime dependencies

#### Runtime Components
- **Supervisor**: Process manager ensuring both services run
- **Nginx**: 
  - Serves frontend on `/`
  - Proxies `/api/*` to backend on `localhost:3001`
  - Handles `/api-docs` for Swagger UI
- **Node.js Backend**: Runs on internal port 3001

### Configuration Files
- `Dockerfile.unified`: Multi-stage build definition
- `nginx.unified.conf`: Nginx configuration with API proxy rules
- `supervisord.conf`: Process management configuration
- `docker-compose.unified.yml`: Simplified compose file

### Benefits
- **Simplified Deployment**: Single container to manage
- **Reduced Resource Usage**: Shared base image layers
- **Easier Port Management**: Only expose port 80/8080
- **Simplified Networking**: No inter-container communication needed

### Limitations
- **Scaling**: Cannot scale frontend/backend independently
- **Updates**: Requires rebuilding entire container for any change
- **Process Isolation**: Less isolation between components

### Environment Variables
```yaml
NODE_ENV: production
VITE_API_URL: http://localhost:8080/api
PORT: 3001
CORS_ORIGIN: http://localhost:8080
```

### Volume Mounts
- LLM Config: `./backend/llm-config.yaml:/app/backend/llm-config.yaml:ro`
- Custom Data (optional): `./data:/usr/share/nginx/html/data`

## Manual Deployment

For deployment without Docker:

### Frontend
```bash
# Build production assets
npm run build

# Serve with any static file server
npx serve -s dist -l 8080
```

### Backend
```bash
cd backend
npm run build
npm start
```

### Requirements
- Node.js 18+
- Chromium (for backend PDF export functionality)

## Environment Configuration

### Frontend Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_CLIENT_PORT` | Development server port | 5173 |
| `VITE_API_URL` | Backend API endpoint | http://localhost:3001/api |
| `VITE_GITHUB_REPO` | GitHub repository (owner/repo) | - |
| `VITE_GITHUB_TOKEN` | GitHub personal access token | - |

### Backend Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3001 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |

### Configuration Files
- `.env`: Frontend environment variables
- `backend/llm-config.yaml`: LLM provider configuration

## Production Considerations

### Security
- Always use HTTPS in production
- Set appropriate CORS origins
- Use environment-specific API tokens
- Review nginx security headers

### Performance
- Enable gzip compression in nginx
- Use CDN for static assets
- Consider Redis for backend caching
- Monitor resource usage

### Monitoring
- Health check endpoint: `/health`
- Backend metrics: Consider adding Prometheus
- Log aggregation: Centralize logs from containers

### Backup
- Backup LLM configuration files
- Backup any custom feedback data
- Document environment configurations