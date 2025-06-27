import { Router } from 'express';
import { getEnvironmentSettingsService, refreshAllConfigurations } from '../services/config/index.js';

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
  
  // Filter sensitive keys
  const sensitiveKeys = ['PASSWORD', 'TOKEN', 'SECRET', 'KEY', 'PRIVATE'];
  const allEnvVars: { [key: string]: string } = {};
  
  // Collect all environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    
    // Check if key contains sensitive information
    const isSensitive = sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive));
    
    if (isSensitive && value.length > 4) {
      // Mask sensitive values
      allEnvVars[key] = '***' + value.slice(-4);
    } else {
      allEnvVars[key] = value;
    }
  }
  
  res.json({
    summary: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      host: HOST,
      totalEnvVars: Object.keys(process.env).length,
      envSettingsSource: process.env.ENV_SETTINGS_ASSET_KEY || '(not configured)'
    },
    categorized: {
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
      assets: {
        GITHUB_CONFIG_REPO: process.env.GITHUB_CONFIG_REPO || '(not set)',
        GITHUB_CONFIG_TOKEN: process.env.GITHUB_CONFIG_TOKEN ? '***' + process.env.GITHUB_CONFIG_TOKEN.slice(-4) : '(not set)',
        GITHUB_CONFIG_BRANCH: process.env.GITHUB_CONFIG_BRANCH || '(not set)',
        ASSET_DB: process.env.ASSET_DB ? 'configured' : '(not set)',
        ASSET_OWNER_CLASS: process.env.ASSET_OWNER_CLASS || '(not set)',
        ASSET_OWNER_NAME: process.env.ASSET_OWNER_NAME || '(not set)',
        ASSET_MEMORY_CACHE_ENABLED: process.env.ASSET_MEMORY_CACHE_ENABLED || '(not set)',
        ASSET_MEMORY_CACHE_TTL: process.env.ASSET_MEMORY_CACHE_TTL || '(not set)',
        AGENT_CONFIG_ASSET_KEY: process.env.AGENT_CONFIG_ASSET_KEY || '(not set)',
        LLM_CONFIG_ASSET_KEY: process.env.LLM_CONFIG_ASSET_KEY || '(not set)',
        ENV_SETTINGS_ASSET_KEY: process.env.ENV_SETTINGS_ASSET_KEY || '(not set)',
        CLIENT_SETTINGS: process.env.CLIENT_SETTINGS || '(not set)'
      }
    },
    allEnvironmentVariables: allEnvVars,
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
    let settingsObject = {};
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