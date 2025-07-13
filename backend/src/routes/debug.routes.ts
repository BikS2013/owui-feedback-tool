import { Router } from 'express';
import { getEnvironmentSettingsService, refreshAllConfigurations } from '../services/config/index.js';

const router = Router();

// Helper function to get allowed origins (used by other endpoints)
const getAllowedOrigins = (): string[] | string | undefined => {
  const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  
  if (!origins) return undefined;
  
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
  
  // Filter sensitive keys
  const sensitiveKeys = ['PASSWORD', 'TOKEN', 'SECRET', 'KEY', 'PRIVATE'];
  const envVars: { [key: string]: string } = {};
  
  // Iterate through all environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    
    // Check if key contains sensitive information
    const isSensitive = sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive));
    
    if (isSensitive && value.length > 4) {
      // Mask sensitive values
      envVars[key] = '***' + value.slice(-4);
    } else {
      envVars[key] = value;
    }
  }
  
  res.json({
    environmentVariables: envVars,
    count: Object.keys(envVars).length,
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/debug/cors:
 *   get:
 *     summary: Get current CORS configuration and status
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: CORS configuration details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: object
 *                   properties:
 *                     CORS_ORIGINS:
 *                       type: string
 *                       description: Raw CORS_ORIGINS environment variable
 *                     CORS_ORIGIN:
 *                       type: string
 *                       description: Raw CORS_ORIGIN environment variable (legacy)
 *                     allowedOrigins:
 *                       oneOf:
 *                         - type: string
 *                           description: Wildcard '*' for all origins
 *                         - type: array
 *                           items:
 *                             type: string
 *                           description: List of allowed origins
 *                     type:
 *                       type: string
 *                       description: Type of allowed origins (string or array)
 *                 currentRequest:
 *                   type: object
 *                   properties:
 *                     origin:
 *                       type: string
 *                       description: Origin header from current request
 *                     isAllowed:
 *                       type: boolean
 *                       description: Whether current origin is allowed
 *                 middleware:
 *                   type: object
 *                   properties:
 *                     credentials:
 *                       type: boolean
 *                       description: Whether credentials are allowed
 *                     methods:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Allowed HTTP methods
 *                     allowedHeaders:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Allowed request headers
 */
router.get('/cors', (req: any, res: any) => {
  const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = getAllowedOrigins();
  const currentOrigin = req.get('origin') || req.get('referer') || 'no-origin';
  
  // Check if current origin is allowed
  let isAllowed = false;
  if (allowedOrigins === '*') {
    isAllowed = true;
  } else if (Array.isArray(allowedOrigins)) {
    isAllowed = allowedOrigins.includes(currentOrigin);
  }
  
  res.json({
    configured: {
      CORS_ORIGINS: process.env.CORS_ORIGINS || '(not set)',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '(not set)',
      allowedOrigins: allowedOrigins,
      type: Array.isArray(allowedOrigins) ? 'array' : typeof allowedOrigins,
      rawValue: origins
    },
    currentRequest: {
      origin: currentOrigin,
      host: req.get('host'),
      isAllowed: isAllowed,
      headers: {
        origin: req.get('origin') || '(not present)',
        referer: req.get('referer') || '(not present)',
        host: req.get('host') || '(not present)'
      }
    },
    middleware: {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    examples: {
      curlTest: `curl -H "Origin: ${currentOrigin}" -I http://${req.get('host')}/api/debug/cors`,
      allowedOriginsExample: Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/debug/env/reload:
 *   post:
 *     summary: Reload environment settings from configuration repository
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Environment settings reloaded successfully
 *       403:
 *         description: Debug endpoints disabled in production
 *       500:
 *         description: Failed to reload environment settings
 */
router.post('/env/reload', async (req: any, res: any) => {
  // Only allow in development mode for security
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ENDPOINTS) {
    return res.status(403).json({ error: 'Debug endpoints are disabled in production' });
  }
  
  try {
    await refreshAllConfigurations();
    res.json({ 
      success: true, 
      message: 'All configurations reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to reload configurations:', error);
    res.status(500).json({ 
      error: 'Failed to reload configurations',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/debug/env/test-load:
 *   get:
 *     summary: Test environment settings loading
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: Environment settings loading test results
 *       403:
 *         description: Debug endpoints disabled in production
 */
router.get('/env/test-load', async (req: any, res: any) => {
  // Only allow in development mode for security
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEBUG_ENDPOINTS) {
    return res.status(403).json({ error: 'Debug endpoints are disabled in production' });
  }
  
  try {
    const service = getEnvironmentSettingsService();
    
    // Try to get all settings
    let settings = {};
    let loadError = null;
    
    try {
      settings = await service.getAll();
    } catch (error: any) {
      loadError = error.message;
    }
    
    // Convert Map to object if it's a Map
    let settingsObject: Record<string, any> = {};
    if (settings instanceof Map) {
      for (const [key, value] of settings) {
        settingsObject[key] = value;
      }
    } else {
      settingsObject = settings;
    }
    
    res.json({
      assetKey: process.env.ENV_SETTINGS_ASSET_KEY || 'settings/env-settings',
      loadError,
      settingsCount: Object.keys(settingsObject).length,
      settings: settingsObject,
      githubConfig: {
        repo: process.env.GITHUB_CONFIG_REPO || '(not set)',
        branch: process.env.GITHUB_CONFIG_BRANCH || 'main',
        hasToken: !!process.env.GITHUB_CONFIG_TOKEN
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Failed to test environment settings loading',
      message: error.message
    });
  }
});

export const debugRoutes = router;