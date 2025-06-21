import { Router, Request, Response } from 'express';
import { EnvironmentConfiguration } from '../types/environment-configuration';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Get full configuration for the current environment
router.get('/configuration', async (req: Request, res: Response) => {
  try {
    // First try to load from configuration.json file in backend config directory
    const configPath = path.join(process.cwd(), 'config/configuration.json');
    
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Merge config.json with environment variables (env vars as fallback)
      const completeConfig = {
        environment: config.environment,
        version: config.version,
        timestamp: config.timestamp,
        features: {
          // Use config.json values if defined, otherwise check env vars
          show_documents: config.features?.show_documents !== undefined 
            ? config.features.show_documents 
            : (process.env.SHOW_DOCUMENTS === 'false' ? false : (process.env.SHOW_DOCUMENTS === 'true' ? true : undefined)),
          show_runs: config.features?.show_runs !== undefined 
            ? config.features.show_runs 
            : (process.env.SHOW_RUNS === 'false' ? false : (process.env.SHOW_RUNS === 'true' ? true : undefined)),
          show_checkpoints: config.features?.show_checkpoints !== undefined 
            ? config.features.show_checkpoints 
            : (process.env.SHOW_CHECKPOINTS === 'false' ? false : (process.env.SHOW_CHECKPOINTS === 'true' ? true : undefined))
        },
        // Add metadata about configuration sources
        _configSources: {
          show_documents: config.features?.show_documents !== undefined ? 'config.json' : (process.env.SHOW_DOCUMENTS ? 'env' : 'undefined'),
          show_runs: config.features?.show_runs !== undefined ? 'config.json' : (process.env.SHOW_RUNS ? 'env' : 'undefined'),
          show_checkpoints: config.features?.show_checkpoints !== undefined ? 'config.json' : (process.env.SHOW_CHECKPOINTS ? 'env' : 'undefined')
        }
      };
      
      return res.json(completeConfig);
    }
    
    // Fallback to environment-based configuration
    const environment = process.env.NODE_ENV || 'development';
    
    // Build simplified configuration based on environment
    const config: EnvironmentConfiguration = {
      environment: environment as 'development' | 'staging' | 'production',
      version: process.env.APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        // Tab visibility features from environment variables
        show_documents: process.env.SHOW_DOCUMENTS === 'false' ? false : (process.env.SHOW_DOCUMENTS === 'true' ? true : undefined),
        show_runs: process.env.SHOW_RUNS === 'false' ? false : (process.env.SHOW_RUNS === 'true' ? true : undefined),
        show_checkpoints: process.env.SHOW_CHECKPOINTS === 'false' ? false : (process.env.SHOW_CHECKPOINTS === 'true' ? true : undefined)
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

export default router;