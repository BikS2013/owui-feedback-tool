# Multi-stage build for optimized production image

# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy all dependencies for build
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_CLIENT_PORT
ARG VITE_GITHUB_REPO
ARG VITE_GITHUB_TOKEN

# Set environment variables for the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLIENT_PORT=$VITE_CLIENT_PORT
ENV VITE_GITHUB_REPO=$VITE_GITHUB_REPO
ENV VITE_GITHUB_TOKEN=$VITE_GITHUB_TOKEN

# Build the application
RUN npm run build

# Stage 2: Production image with nginx
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy the default feedback data file
COPY public/feedback-history-export.json /usr/share/nginx/html/

# Set default value for API_URL
ENV API_URL=http://localhost:3001

# Expose port 80
EXPOSE 80

# Use shell form to allow environment variable substitution
CMD sh -c "envsubst '\$API_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"