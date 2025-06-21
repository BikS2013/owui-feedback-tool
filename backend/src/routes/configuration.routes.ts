import { Router, Request, Response } from 'express';
import { EnvironmentConfiguration } from '../types/environment-configuration';
import { getClientConfigService } from '../services/clientConfigService.js';

const router = Router();

// Get full configuration for the current environment
router.get('/configuration', async (req: Request, res: Response) => {
  try {
    const clientConfigService = getClientConfigService();
    
    // Ensure the service is initialized
    if (!clientConfigService.isInitialized()) {
      await clientConfigService.initialize();
    }
    
    // Get configuration from the service
    const config = clientConfigService.getConfiguration();
    
    // Merge with environment variables as override (env vars take precedence)
    const completeConfig = {
      environment: config.environment,
      version: config.version,
      timestamp: config.timestamp,
      features: {
        // Environment variables can override configuration repo values
        show_documents: process.env.SHOW_DOCUMENTS !== undefined 
          ? (process.env.SHOW_DOCUMENTS === 'false' ? false : true)
          : config.features.show_documents,
        show_runs: process.env.SHOW_RUNS !== undefined 
          ? (process.env.SHOW_RUNS === 'false' ? false : true)
          : config.features.show_runs,
        show_checkpoints: process.env.SHOW_CHECKPOINTS !== undefined 
          ? (process.env.SHOW_CHECKPOINTS === 'false' ? false : true)
          : config.features.show_checkpoints
      },
      // Add metadata about configuration sources
      _configSources: {
        base: process.env.CLIENT_SETTINGS ? 'github' : 'local',
        show_documents: process.env.SHOW_DOCUMENTS !== undefined ? 'env' : (process.env.CLIENT_SETTINGS ? 'github' : 'local'),
        show_runs: process.env.SHOW_RUNS !== undefined ? 'env' : (process.env.CLIENT_SETTINGS ? 'github' : 'local'),
        show_checkpoints: process.env.SHOW_CHECKPOINTS !== undefined ? 'env' : (process.env.CLIENT_SETTINGS ? 'github' : 'local')
      }
    };
    
    res.json(completeConfig);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Reload configuration from source
router.post('/configuration/reload', async (req: Request, res: Response) => {
  try {
    const clientConfigService = getClientConfigService();
    await clientConfigService.reload();
    
    res.json({ success: true, message: 'Configuration reloaded successfully' });
  } catch (error) {
    console.error('Error reloading configuration:', error);
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

export default router;