import { Router, Request, Response, NextFunction } from 'express';
import { getGitHubAssetService } from '../services/githubAssetService';

const router = Router();

// Middleware to check if the service is configured
const checkServiceConfigured = (req: Request, res: Response, next: NextFunction) => {
  const githubAssetService = getGitHubAssetService();
  if (!githubAssetService.isServiceConfigured()) {
    return res.status(503).json({ 
      error: 'GitHub asset service not configured',
      message: 'Please set GITHUB_CONFIG_REPO and GITHUB_CONFIG_TOKEN environment variables'
    });
  }
  next();
};

// Apply middleware to all routes
router.use(checkServiceConfigured);

/**
 * @swagger
 * /api/assets:
 *   get:
 *     summary: List assets
 *     description: Lists available assets in a directory
 *     tags: [Assets]
 *     parameters:
 *       - in: query
 *         name: path
 *         required: false
 *         schema:
 *           type: string
 *         description: Directory path to list (defaults to repository root)
 *     responses:
 *       200:
 *         description: List of asset paths
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["config/production/api-settings.json", "config/staging/api-settings.json", "templates/email-template.html"]
 *       500:
 *         description: Failed to list assets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       503:
 *         description: Service not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string || '';
    const githubAssetService = getGitHubAssetService();
    const assets = await githubAssetService.listAssets(path);
    
    res.json(assets);
  } catch (error: any) {
    console.error('Error listing assets:', error);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

/**
 * @swagger
 * /api/assets/cache/clear:
 *   post:
 *     summary: Clear asset cache
 *     description: Clears the asset cache for improved performance
 *     tags: [Assets]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: Specific asset key to clear from cache. If not provided, entire cache is cleared.
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cache cleared for key: config/production/api-settings.json"
 *       500:
 *         description: Failed to clear cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       503:
 *         description: Service not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    const githubAssetService = getGitHubAssetService();
    
    if (key) {
      githubAssetService.clearCacheForKey(key);
      res.json({ message: `Cache cleared for key: ${key}` });
    } else {
      githubAssetService.clearCache();
      res.json({ message: 'All cache cleared' });
    }
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * @swagger
 * /api/assets/{key}/metadata:
 *   get:
 *     summary: Get asset with metadata
 *     description: Retrieves an asset with its metadata including SHA, size, and last modified date
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The full path to the file in the repository
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Asset category for classification in database
 *     responses:
 *       200:
 *         description: Asset with metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   description: The file content
 *                 sha:
 *                   type: string
 *                   description: SHA hash of the file
 *                 size:
 *                   type: number
 *                   description: File size in bytes
 *                 encoding:
 *                   type: string
 *                   description: File encoding (typically base64)
 *                 lastModified:
 *                   type: string
 *                   format: date-time
 *                   description: Last modification date
 *       400:
 *         description: Asset key is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to retrieve asset metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       503:
 *         description: Service not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.get('/:key(*)/metadata', async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const category = req.query.category as string | undefined;
    
    if (!key) {
      return res.status(400).json({ error: 'Asset key is required' });
    }

    const githubAssetService = getGitHubAssetService();
    const assetData = await githubAssetService.getAssetWithMetadata(key, category);
    res.json(assetData);
  } catch (error: any) {
    console.error('Error retrieving asset metadata:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve asset metadata' });
  }
});

/**
 * @swagger
 * /api/assets/{key}:
 *   get:
 *     summary: Get asset content
 *     description: Retrieves the content of a specific asset from the GitHub configuration repository
 *     tags: [Assets]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The full path to the file in the repository (e.g., config/production/api-settings.json)
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Asset category for classification in database (e.g., configuration, template)
 *     responses:
 *       200:
 *         description: Asset content retrieved successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *           application/x-yaml:
 *             schema:
 *               type: string
 *       400:
 *         description: Asset key is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: GitHub authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       429:
 *         description: GitHub API rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       503:
 *         description: Service not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.get('/:key(*)', async (req: Request, res: Response) => {
  try {
    const key = req.params.key;
    const category = req.query.category as string | undefined;
    
    if (!key) {
      return res.status(400).json({ error: 'Asset key is required' });
    }

    const githubAssetService = getGitHubAssetService();
    const content = await githubAssetService.getAsset(key, category);
    
    // Determine content type based on file extension
    const extension = key.split('.').pop()?.toLowerCase();
    let contentType = 'text/plain';
    
    switch (extension) {
      case 'json':
        contentType = 'application/json';
        break;
      case 'yaml':
      case 'yml':
        contentType = 'application/x-yaml';
        break;
      case 'xml':
        contentType = 'application/xml';
        break;
      case 'html':
        contentType = 'text/html';
        break;
      case 'css':
        contentType = 'text/css';
        break;
      case 'js':
        contentType = 'application/javascript';
        break;
      case 'md':
        contentType = 'text/markdown';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.send(content);
  } catch (error: any) {
    console.error('Error retrieving asset:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('authentication')) {
      return res.status(401).json({ error: error.message });
    }
    if (error.message.includes('rate limit')) {
      return res.status(429).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve asset' });
  }
});

export default router;