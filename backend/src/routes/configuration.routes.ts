import { Router, Request, Response } from 'express';
import { getClientConfigService, getClientConfiguration } from '../services/config/index.js';

const router = Router();

// Get full configuration for the current environment
// Also available at /config.json for compatibility
router.get(['/configuration', '/config.json'], async (req: Request, res: Response) => {
  try {
    // Get configuration from the service
    const config = await getClientConfiguration();
    
    if (!config) {
      throw new Error('Client configuration not available');
    }
    
    // Return the configuration as-is (no defaults or fallbacks)
    res.json(config);
  } catch (error) {
    console.error('Error fetching configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch configuration';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
});

// Reload configuration from source
router.post('/configuration/reload', async (req: Request, res: Response) => {
  try {
    const service = getClientConfigService();
    await service.reload();
    
    res.json({ success: true, message: 'Configuration reloaded successfully' });
  } catch (error) {
    console.error('Error reloading configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to reload configuration';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    });
  }
});

export default router;