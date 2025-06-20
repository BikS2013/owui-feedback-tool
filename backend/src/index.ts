import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { exportRoutes } from './routes/export.routes.js';
import { githubRoutes } from './routes/github.routes.js';
import { llmRoutes } from './routes/llm.routes.js';
import { agentRoutes } from './routes/agent.routes.js';
import { debugRoutes } from './routes/debug.routes.js';
import { swaggerSpec } from './swagger.config.js';
import { consoleController } from './utils/console-controller.js';
import { databaseService } from './services/database.service.js';
import assetsRouter from './routes/assets.js';
import { getGitHubAssetService } from './services/githubAssetService.js';
import { getAssetDatabaseService } from './services/assetDatabaseService.js';
import { loadEnvironmentSettings } from './services/environmentSettingsService.js';

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
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // If wildcard, allow all origins
    if (allowedOrigins === '*') return callback(null, true);
    
    // Check if origin is in the allowed list
    if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));

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

// Routes
app.use('/api/export', exportRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/assets', assetsRouter);

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
    // Load environment settings from configuration repository (if available)
    await loadEnvironmentSettings();
    
    // Re-read PORT and HOST in case they were loaded from settings
    PORT = process.env.PORT || 3001;
    HOST = process.env.HOST || 'localhost';
    
    app.listen(PORT, () => {
      console.log('\n🚀 Server is running!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database Verbose Logging: ${process.env.DATABASE_VERBOSE === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
      
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
      console.log(`   • POST http://${HOST}:${PORT}/api/export/conversation`);
      console.log(`   • POST http://${HOST}:${PORT}/api/export/qa-pair`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/github/status`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/github/tree`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/github/files`);
      console.log(`   • POST http://${HOST}:${PORT}/api/llm/execute-prompt`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/llm/status/:requestId`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/llm/configurations`);
      console.log(`   • POST http://${HOST}:${PORT}/api/llm/test`);
      console.log(`   • POST http://${HOST}:${PORT}/api/llm/reload`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/agent`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/agent/:name`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/agent/threads?agentName=xxx`);
      console.log(`   • POST http://${HOST}:${PORT}/api/agent/reload`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/assets/:key`);
      console.log(`   • GET  http://${HOST}:${PORT}/api/assets`);
      console.log(`   • POST http://${HOST}:${PORT}/api/assets/cache/clear`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📦 Asset Services Configuration:');
      
      // Initialize asset services to report their configuration status
      getGitHubAssetService();
      getAssetDatabaseService();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;