import { Router } from 'express';

const router = Router();

// Helper function to get allowed origins
const getAllowedOrigins = (): string[] | string => {
  const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
  
  // If it's a wildcard, return it as is
  if (origins === '*') return '*';
  
  // Split by comma and trim whitespace
  return origins.split(',').map(origin => origin.trim());
};

/**
 * @swagger
 * /api/debug/env:
 *   get:
 *     summary: Show environment configuration (debug endpoint)
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Environment configuration
 *       403:
 *         description: Debug endpoints disabled in production
 */
router.get('/env', (req: any, res: any) => {
  // Only allow in development mode for security
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ENDPOINTS) {
    return res.status(403).json({ error: 'Debug endpoints are disabled in production' });
  }
  
  const allowedOrigins = getAllowedOrigins();
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || 'localhost';
  
  res.json({
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: HOST,
    cors: {
      CORS_ORIGINS: process.env.CORS_ORIGINS || '(not set)',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '(not set)',
      allowedOrigins: allowedOrigins,
      type: Array.isArray(allowedOrigins) ? 'array' : typeof allowedOrigins
    },
    github: {
      GITHUB_REPO: process.env.GITHUB_REPO || '(not set)',
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '***' + process.env.GITHUB_TOKEN.slice(-4) : '(not set)',
      GITHUB_DATA_FOLDER: process.env.GITHUB_DATA_FOLDER || 'data',
      GITHUB_PROMPTS_FOLDER: process.env.GITHUB_PROMPTS_FOLDER || 'prompts'
    },
    azure: {
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? '***' + process.env.AZURE_OPENAI_API_KEY.slice(-4) : '(not set)',
      AZURE_OPENAI_API_ENDPOINT: process.env.AZURE_OPENAI_API_ENDPOINT || '(not set)',
      AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || '(not set)',
      AZURE_OPENAI_API_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || '(not set)'
    },
    database: {
      DATABASE_HOST: process.env.DATABASE_HOST || 'postgres',
      DATABASE_PORT: process.env.DATABASE_PORT || '5432',
      DATABASE_NAME: process.env.DATABASE_NAME || 'agentdb',
      DATABASE_USER: process.env.DATABASE_USER || 'agent',
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? '***' : '(not set)'
    },
    timestamp: new Date().toISOString()
  });
});

export const debugRoutes = router;