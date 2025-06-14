# Docker Setup for OWUI Feedback Backend

This guide explains how to run the OWUI Feedback backend using Docker.

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose v2.0+
- Make (optional, for using Makefile commands)

## Quick Start

### Development Environment

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration (database credentials, API keys, etc.)

3. Start the development environment:
   ```bash
   # Using docker-compose
   docker-compose -f docker-compose.dev.yml up -d

   # Or using Make
   make up
   ```

4. View logs:
   ```bash
   # Using docker-compose
   docker-compose -f docker-compose.dev.yml logs -f

   # Or using Make
   make logs
   ```

### Production Environment

1. Build the production image:
   ```bash
   # Using Docker
   docker build -f Dockerfile.production -t owui-feedback-backend:production .

   # Or using Make
   make build-prod
   ```

2. Start production containers:
   ```bash
   # Using docker-compose
   docker-compose up -d

   # Or using Make
   make up-prod
   ```

## Available Services

### Development Setup (`docker-compose.dev.yml`)

- **backend-dev**: Node.js backend with hot reloading
  - Port: 3001
  - Debug port: 9229
  - Mounts source code for live updates

- **postgres**: PostgreSQL database
  - Port: 5432
  - Database: feedback_db
  - User: postgres
  - Password: postgres

- **pgadmin**: Database management UI (optional)
  - Port: 5050
  - Email: admin@example.com
  - Password: admin

### Production Setup (`docker-compose.yml`)

- **backend**: Optimized production backend
  - Port: 3001
  - Multi-stage build for smaller image
  - Non-root user for security
  - Health checks enabled

- **postgres**: PostgreSQL database (optional)
  - Port: 5432
  - Persistent volume for data

## Docker Images

### Development Image (`Dockerfile.dev`)
- Based on `node:18-alpine`
- Includes Chromium for Puppeteer
- All dependencies installed
- Uses nodemon for hot reloading

### Production Image (`Dockerfile.production`)
- Multi-stage build
- Only production dependencies
- Non-root user (nodejs)
- Optimized for size and security
- Health check included

### Standard Image (`Dockerfile`)
- Simple production build
- Includes all dependencies
- Good for quick deployments

## Environment Variables

Key environment variables:

```bash
# Server
NODE_ENV=production|development
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=feedback_db
DB_USER=postgres
DB_PASSWORD=postgres

# Agent Database (if different)
AGENT_DB_HOST=localhost
AGENT_DB_PORT=5432
AGENT_DB_NAME=agent_db
AGENT_DB_USER=postgres
AGENT_DB_PASSWORD=postgres

# LLM APIs (optional)
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key
```

## Makefile Commands

If you have Make installed, you can use these shortcuts:

```bash
make help        # Show all available commands
make build       # Build development image
make build-prod  # Build production image
make up          # Start development containers
make up-prod     # Start production containers
make down        # Stop containers
make logs        # View logs
make shell       # Open shell in backend container
make db-shell    # Open PostgreSQL shell
make clean       # Remove all containers and volumes
make test        # Run tests
```

## Troubleshooting

### Port Already in Use
If port 3001 or 5432 is already in use:
```bash
# Find process using the port
lsof -i :3001
lsof -i :5432

# Or change the port in docker-compose.yml
ports:
  - "3002:3001"  # Use 3002 instead
```

### Database Connection Issues
1. Ensure PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection from backend:
   ```bash
   docker-compose exec backend-dev sh
   nc -zv postgres 5432
   ```

### Puppeteer Issues
If Puppeteer fails to launch Chromium:
1. Ensure the Chromium path is correct:
   ```bash
   docker-compose exec backend-dev sh
   which chromium-browser
   ```

2. Check if all dependencies are installed:
   ```bash
   docker-compose exec backend-dev sh
   ldd /usr/bin/chromium-browser
   ```

### Permission Issues
If you encounter permission errors:
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended)
sudo docker-compose up
```

## Production Deployment

### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml owui-feedback
```

### Using Kubernetes
Convert docker-compose to Kubernetes manifests:
```bash
kompose convert -f docker-compose.yml
```

### Security Considerations
1. Always use secrets for sensitive data
2. Run containers as non-root user
3. Use specific image tags instead of `latest`
4. Enable health checks
5. Limit container resources
6. Use read-only file systems where possible

## Monitoring

### Health Checks
The backend includes a health check endpoint:
```bash
curl http://localhost:3001/health
```

### Container Stats
Monitor resource usage:
```bash
docker stats owui-feedback-backend
```

### Logs
View logs with timestamps:
```bash
docker logs -f --timestamps owui-feedback-backend
```

## Backup and Restore

### Backup Database
```bash
# Backup
docker-compose exec postgres pg_dump -U postgres feedback_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres feedback_db < backup.sql
```

### Backup Volumes
```bash
# Backup
docker run --rm -v owui-feedback_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore
docker run --rm -v owui-feedback_postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```