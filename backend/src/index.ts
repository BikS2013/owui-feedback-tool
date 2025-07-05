// Initialize environment first - this loads .env and configuration settings
import { envInitialized } from './init-env.js';
await envInitialized;

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { exportRoutes } from './routes/export.routes.js';
import { githubRoutes } from './routes/github.routes.js';
import { llmRoutes } from './routes/llm.routes.js';
import { agentRoutes } from './routes/agent.routes.js';
import { debugRoutes } from './routes/debug.routes.js';
import configurationRoutes from './routes/configuration.routes.js';
import { userPromptsRoutes } from './routes/userPrompts.routes.js';
import { swaggerSpec } from './swagger.config.js';
import { consoleController } from './utils/console-controller.js';
import { databaseService } from './services/database.service.js';
import { initializeConfigurationServices } from './services/config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const shutdownLockPath = path.join(__dirname, '..', 'shutdown.lock');

// NBG OAuth imports
import authRouter from './routes/auth.routes.js';
import { globalAuthMiddleware } from './middleware/auth-helpers.js';
import { requireAuth } from './middleware/token-validator.js';
import { isAuthEnabled } from './middleware/nbg-auth.config.js';

// Initialize console controller with database service reference
consoleController.setDatabaseService(databaseService);

const app: Application = express();
// These will be re-read after environment settings are loaded
let PORT = process.env.PORT || 3001;
let HOST = process.env.HOST || 'localhost';

// Parse allowed origins from environment variable
const getAllowedOrigins = (): string[] | string => {
  const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
  
  // If it's a wildcard, return it as is
  if (origins === '*') return '*';
  
  // Split by comma and trim whitespace
  return origins.split(',').map(origin => origin.trim());
};

// CORS configuration with multiple origins support
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Log CORS check for debugging
    console.log(`CORS check - Origin: ${origin || 'none'}, Allowed: ${JSON.stringify(allowedOrigins)}`);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // If wildcard, allow all origins
    if (allowedOrigins === '*') return callback(null, true);
    
    // Check if origin is in the allowed list
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Also check referer header as fallback
      const referer = (global as any).currentRequest?.get('referer');
      if (referer) {
        const refererOrigin = new URL(referer).origin;
        if (Array.isArray(allowedOrigins) && allowedOrigins.includes(refererOrigin)) {
          callback(null, true);
          return;
        }
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes
app.options('*', cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.url}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation with dynamic host detection
app.use('/api-docs', 
  swaggerUi.serve, 
  (req: any, res: any, next: any) => {
    // Get the host from the request header to handle Docker port mappings
    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
    
    // Create a dynamic swagger spec with the correct server URL
    const dynamicSwaggerSpec: any = {
      ...swaggerSpec,
      servers: [
        {
          url: `${protocol}://${host}`,
          description: 'Current server (auto-detected from request)'
        }
      ]
    };
    
    // Serve the dynamic spec
    return swaggerUi.setup(dynamicSwaggerSpec)(req, res, next);
  }
);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// NBG OAuth routes - MUST be before other routes
app.use('/api/auth', authRouter);

// NBG OAuth callback routes - required by NBG Identity Server
app.get('/signin-nbg', (req, res) => {
  // Redirect to auth callback handler with query parameters
  const queryString = req.url.split('?')[1] || '';
  res.redirect(`/api/auth/callback${queryString ? '?' + queryString : ''}`);
});

app.get('/signout-callback-nbg', (req, res) => {
  // Redirect to logout callback handler with query parameters
  const queryString = req.url.split('?')[1] || '';
  res.redirect(`/api/auth/logout-callback${queryString ? '?' + queryString : ''}`);
});

// Apply global auth middleware - checks if auth is required
app.use(globalAuthMiddleware);

// Routes - now with auth protection where needed
app.use('/api/export', requireAuth, exportRoutes);
app.use('/api/github', requireAuth, githubRoutes);
app.use('/api/llm', requireAuth, llmRoutes);
app.use('/api/agent', requireAuth, agentRoutes);
app.use('/api/user-prompts', requireAuth, userPromptsRoutes);
app.use('/api/debug', debugRoutes); // Debug routes might be conditionally protected
app.use('/api', configurationRoutes); // Configuration route - no auth required for initial config

// Root-level config.json endpoint for frontend discovery
app.get('/config.json', (req: express.Request, res: express.Response) => {
  const protocol = req.protocol;
  const host = req.get('host') || `localhost:${PORT}`;
  const apiBaseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;
  
  res.json({
    API_BASE_URL: apiBaseUrl
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with async initialization
async function startServer() {
  try {
    // Check if another instance is shutting down
    if (fs.existsSync(shutdownLockPath)) {
      console.log('⏳ Another instance is shutting down, waiting...');
      // Wait for the lock file to be removed (max 10 seconds)
      let waitTime = 0;
      while (fs.existsSync(shutdownLockPath) && waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
      }
      if (fs.existsSync(shutdownLockPath)) {
        // Force remove stale lock
        fs.unlinkSync(shutdownLockPath);
      }
    }
    
    // Initialize all configuration services
    await initializeConfigurationServices();
    
    // Re-read PORT and HOST in case they were loaded from settings
    PORT = process.env.PORT || 3001;
    HOST = process.env.HOST || 'localhost';
    
    // Function to attempt server start with retry
    const attemptServerStart = async (retries = 5, delay = 1000): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await new Promise((resolve, reject) => {
            const server = app.listen(PORT, () => {
              resolve(server);
            }).on('error', (error: any) => {
              if (error.code === 'EADDRINUSE' && i < retries - 1) {
                console.log(`⚠️  Port ${PORT} is still in use, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
                setTimeout(() => {
                  server.close();
                  reject(error);
                }, delay);
              } else {
                reject(error);
              }
            });
          });
        } catch (error) {
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
    
    const server = await attemptServerStart();
    
    console.log('\n🚀 Server is running!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database Verbose Logging: ${process.env.DATABASE_VERBOSE === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Display NBG OAuth status
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 NBG OAuth Configuration:');
    if (isAuthEnabled()) {
      console.log('   ✅ Authentication ENABLED');
      console.log(`   • Issuer: ${process.env.NBG_OAUTH_ISSUER || 'Not configured'}`);
      console.log(`   • Client ID: ${process.env.NBG_CLIENT_ID ? '***' + process.env.NBG_CLIENT_ID.slice(-4) : 'Not configured'}`);
      console.log(`   • Scopes: ${process.env.NBG_OAUTH_SCOPES || 'openid profile email'}`);
    } else {
      console.log('   ❌ Authentication DISABLED (Development mode)');
    }
    
    // Display CORS configuration
    const allowedOrigins = getAllowedOrigins();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 CORS Configuration:');
    if (allowedOrigins === '*') {
      console.log('   ⚠️  All origins allowed (wildcard)');
    } else if (Array.isArray(allowedOrigins)) {
      console.log('   Allowed origins:');
      allowedOrigins.forEach(origin => console.log(`   • ${origin}`));
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 API Documentation:');
    console.log(`   👉 http://${HOST}:${PORT}/api-docs`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 Available endpoints:');
    console.log(`   • GET  http://${HOST}:${PORT}/health`);
    console.log('   ── Authentication ──');
    console.log(`   • GET  http://${HOST}:${PORT}/api/auth/status`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/auth/login`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/auth/logout`);
    console.log(`   • POST http://${HOST}:${PORT}/api/auth/refresh`);
    console.log('   ── Export (Protected) ──');
    console.log(`   • POST http://${HOST}:${PORT}/api/export/conversation`);
    console.log(`   • POST http://${HOST}:${PORT}/api/export/qa-pair`);
    console.log('   ── GitHub (Protected) ──');
    console.log(`   • GET  http://${HOST}:${PORT}/api/github/status`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/github/tree`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/github/files`);
    console.log('   ── LLM (Protected) ──');
    console.log(`   • POST http://${HOST}:${PORT}/api/llm/execute-prompt`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/llm/status/:requestId`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/llm/configurations`);
    console.log(`   • POST http://${HOST}:${PORT}/api/llm/test`);
    console.log(`   • POST http://${HOST}:${PORT}/api/llm/reload`);
    console.log('   ── Agent (Protected) ──');
    console.log(`   • GET  http://${HOST}:${PORT}/api/agent`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/agent/:name`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/agent/threads?agentName=xxx`);
    console.log(`   • POST http://${HOST}:${PORT}/api/agent/reload`);
    console.log('   ── User Prompts (Protected) ──');
    console.log(`   • GET  http://${HOST}:${PORT}/api/user-prompts`);
    console.log(`   • GET  http://${HOST}:${PORT}/api/user-prompts/:promptId`);
    console.log(`   • POST http://${HOST}:${PORT}/api/user-prompts`);
    console.log(`   • PUT  http://${HOST}:${PORT}/api/user-prompts/:promptId`);
    console.log(`   • DELETE http://${HOST}:${PORT}/api/user-prompts/:promptId`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Track active connections for proper cleanup
    const connections = new Set<any>();
    
    server.on('connection', (connection: any) => {
      connections.add(connection);
      connection.on('close', () => {
        connections.delete(connection);
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📛 ${signal} signal received: closing HTTP server...`);
      
      // Create shutdown lock
      try {
        fs.writeFileSync(shutdownLockPath, 'shutting down');
      } catch (err) {
        // Ignore errors creating lock file
      }
      
      // Immediately destroy all connections for faster shutdown
      connections.forEach((connection) => {
        connection.destroy();
      });
      
      // Stop accepting new connections
      server.close(() => {
        console.log('✅ HTTP server closed');
        // Remove shutdown lock
        try {
          if (fs.existsSync(shutdownLockPath)) {
            fs.unlinkSync(shutdownLockPath);
          }
        } catch (err) {
          // Ignore errors removing lock file
        }
        process.exit(0);
      });

      // Force close after 500ms for faster restarts
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        // Remove shutdown lock
        try {
          if (fs.existsSync(shutdownLockPath)) {
            fs.unlinkSync(shutdownLockPath);
          }
        } catch (err) {
          // Ignore errors removing lock file
        }
        process.exit(1);
      }, 500);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;