# Docker Setup for Athena Feedback Explorer

This guide explains how to build and run the Athena Feedback Explorer using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Quick Start

### Using Docker Compose (Recommended)

1. Build and start the container:
   ```bash
   npm run docker:compose:up
   ```
   Or directly with docker-compose:
   ```bash
   docker-compose up -d
   ```

2. Access the application at: http://localhost:8080

3. Stop the container:
   ```bash
   npm run docker:compose:down
   ```

### Using Docker CLI

1. Build the Docker image:
   ```bash
   npm run docker:build
   ```
   Or directly with Docker:
   ```bash
   docker build -t athena-feedback-explorer:latest .
   ```

2. Run the container:
   ```bash
   npm run docker:run
   ```
   Or directly with Docker:
   ```bash
   docker run -p 8080:80 --name athena-feedback-explorer --rm athena-feedback-explorer:latest
   ```

3. Access the application at: http://localhost:8080

4. Stop the container:
   ```bash
   npm run docker:stop
   ```

## Advanced Configuration

### Custom Port

To run on a different port, modify the port mapping:
```bash
docker run -p 3000:80 --name athena-feedback-explorer --rm athena-feedback-explorer:latest
```

### Custom Data Volume

To use custom feedback data files, mount a volume:
```bash
docker run -p 8080:80 -v /path/to/your/data:/usr/share/nginx/html/data --name athena-feedback-explorer --rm athena-feedback-explorer:latest
```

Or update the docker-compose.yml to uncomment the volume mount.

### Production Deployment

For production deployments, consider:

1. Using a reverse proxy (nginx, traefik)
2. Setting up SSL/TLS certificates
3. Configuring environment-specific settings
4. Setting up health checks:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:80"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

## Image Details

- Base image: `nginx:alpine` (lightweight)
- Exposed port: 80
- Static files served from: `/usr/share/nginx/html`
- Multi-stage build for optimized image size
- Includes gzip compression and caching headers

## Troubleshooting

1. **Port already in use**: Change the host port in the run command or docker-compose.yml
2. **Container won't start**: Check logs with `docker logs athena-feedback-explorer`
3. **Can't access the app**: Ensure the container is running with `docker ps`

## Development vs Production

The Docker image is optimized for production use. For development, continue using:
```bash
npm run dev
```