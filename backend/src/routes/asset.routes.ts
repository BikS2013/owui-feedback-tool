import { Request, Response, Router } from 'express';
import { githubClient, databaseAssetService } from '../services/config/config-clients.js';

const router = Router();

/**
 * @swagger
 * /api/asset/{asset_key}:
 *   get:
 *     summary: Retrieve an asset by key
 *     description: |
 *       Fetch an asset from either GitHub or database based on the asset key.
 *       
 *       **Security**: Assets are restricted based on the API_ACCESSIBLE_ASSETS_PREFIX environment variable.
 *       Only asset keys that start with the configured prefix are accessible through this endpoint.
 *     tags:
 *       - Asset
 *     parameters:
 *       - in: path
 *         name: asset_key
 *         required: true
 *         schema:
 *           type: string
 *         description: |
 *           The asset key to retrieve. Must be URL-encoded if it contains special characters.
 *           For example, "public/config.json" should be encoded as "public%2Fconfig.json".
 *         example: "public%2Fconfig.json"
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [github, database]
 *         description: Specify the source to retrieve from (defaults to GitHub, falls back to database)
 *     responses:
 *       200:
 *         description: Asset retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assetKey:
 *                   type: string
 *                   description: The requested asset key
 *                 source:
 *                   type: string
 *                   enum: [github, database]
 *                   description: The source from which the asset was retrieved
 *                 content:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                   description: The asset content (can be string or JSON object)
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: number
 *                       description: Size of the content in bytes
 *                     contentType:
 *                       type: string
 *                       description: Detected content type
 *                     lastModified:
 *                       type: string
 *                       format: date-time
 *                       description: Last modification timestamp (if available)
 *       403:
 *         description: Access denied - Asset key does not match allowed prefix
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Access denied"
 *                 message:
 *                   type: string
 *                   example: "Asset key does not match allowed prefix"
 *                 assetKey:
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
 *                 assetKey:
 *                   type: string
 *                 triedSources:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
router.get('/asset/:asset_key(*)', async (req: Request, res: Response): Promise<void> => {
  // Decode the URL-encoded asset key
  const encodedAssetKey = req.params.asset_key;
  const assetKey = decodeURIComponent(encodedAssetKey);
  const preferredSource = req.query.source as string;
  
  console.log(`\n🔍 GET /api/asset/${encodedAssetKey}`);
  console.log(`   • Decoded key: ${assetKey}`);
  console.log(`   • Preferred source: ${preferredSource || 'auto'}`);
  
  // Security check: Validate asset key against allowed prefix
  const allowedPrefix = process.env.API_ACCESSIBLE_ASSETS_PREFIX;
  if (allowedPrefix) {
    // Decode the prefix as well to ensure proper comparison
    const decodedPrefix = decodeURIComponent(allowedPrefix);
    if (!assetKey.startsWith(decodedPrefix)) {
      console.log(`   ❌ Access denied: Asset key "${assetKey}" does not start with allowed prefix: "${decodedPrefix}"`);
      res.status(403).json({
        error: 'Access denied',
        message: 'Asset key does not match allowed prefix',
        assetKey,
        allowedPrefix: decodedPrefix
      });
      return;
    }
  }
  
  const triedSources: string[] = [];
  let result: any = null;
  let source: string = '';
  
  try {
    // Try GitHub first (unless database is explicitly requested)
    if (preferredSource !== 'database') {
      try {
        const client = githubClient();
        console.log(`   📦 Trying GitHub...`);
        triedSources.push('github');
        
        result = await client.getAsset(assetKey);
        source = 'github';
        
        console.log(`   ✅ Found in GitHub`);
      } catch (githubError: any) {
        console.log(`   ⚠️ GitHub error: ${githubError.message}`);
        
        // Only try database if GitHub fails and not explicitly requesting GitHub
        if (preferredSource !== 'github') {
          try {
            const dbService = databaseAssetService();
            console.log(`   🗄️ Trying database...`);
            triedSources.push('database');
            
            const dbAsset = await dbService.getAsset(assetKey, 'configuration');
            if (dbAsset) {
              result = dbAsset;
              source = 'database';
              console.log(`   ✅ Found in database`);
            }
          } catch (dbError: any) {
            console.log(`   ⚠️ Database error: ${dbError.message}`);
          }
        }
      }
    } else {
      // Database explicitly requested
      try {
        const dbService = databaseAssetService();
        console.log(`   🗄️ Trying database (explicit request)...`);
        triedSources.push('database');
        
        const dbAsset = await dbService.getAsset(assetKey, 'configuration');
        if (dbAsset) {
          result = dbAsset;
          source = 'database';
          console.log(`   ✅ Found in database`);
        }
      } catch (dbError: any) {
        console.log(`   ⚠️ Database error: ${dbError.message}`);
      }
    }
    
    // Check if we found the asset
    if (!result) {
      console.log(`   ❌ Asset not found in any source`);
      res.status(404).json({
        error: 'Asset not found',
        assetKey,
        triedSources
      });
      return;
    }
    
    // Prepare response
    // Handle different response formats
    let content: any;
    if (source === 'database' && result?.data) {
      // Database returns data in 'data' field
      content = result.data;
    } else if (typeof result === 'string') {
      content = result;
    } else {
      content = result?.content || result;
    }
    const isJson = typeof content === 'object' || (typeof content === 'string' && content.trim().startsWith('{'));
    
    console.log(`   📊 Response: ${source}, ${typeof content}, ${Buffer.byteLength(JSON.stringify(content))} bytes`);
    
    res.json({
      assetKey,
      source,
      content: isJson && typeof content === 'string' ? JSON.parse(content) : content,
      metadata: {
        size: Buffer.byteLength(typeof content === 'string' ? content : JSON.stringify(content)),
        contentType: isJson ? 'application/json' : 'text/plain',
        lastModified: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error(`❌ Error retrieving asset:`, error);
    res.status(500).json({
      error: 'Failed to retrieve asset',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/asset:
 *   get:
 *     summary: List available assets
 *     description: |
 *       Get a list of available assets from configured sources.
 *       
 *       **Security**: Only assets matching the API_ACCESSIBLE_ASSETS_PREFIX environment variable are listed.
 *     tags:
 *       - Asset
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [github, database, all]
 *         description: Filter by source (defaults to all)
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *         description: Filter assets by key prefix
 *         example: "settings/"
 *     responses:
 *       200:
 *         description: List of available assets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         description: Asset key
 *                       source:
 *                         type: string
 *                         enum: [github, database]
 *                         description: Asset source
 *                       type:
 *                         type: string
 *                         description: Asset type (file extension or detected type)
 *                       size:
 *                         type: number
 *                         description: Asset size in bytes (if available)
 *                 total:
 *                   type: integer
 *                   description: Total number of assets
 *       500:
 *         description: Internal server error
 */
router.get('/asset', async (req: Request, res: Response): Promise<void> => {
  const sourceFilter = req.query.source as string;
  const prefix = req.query.prefix as string;
  
  console.log(`\n📋 GET /api/asset (list)`);
  console.log(`   • Source filter: ${sourceFilter || 'all'}`);
  console.log(`   • Prefix filter: ${prefix || 'none'}`);
  
  try {
    const assets: any[] = [];
    
    // Note: This is a simplified implementation
    // In a real implementation, you would need methods to list assets from both sources
    res.json({
      assets: assets.filter(a => !prefix || a.key.startsWith(prefix)),
      total: assets.length,
      note: 'Asset listing requires implementation of list methods in GitHub and Database clients'
    });
    
  } catch (error: any) {
    console.error(`❌ Error listing assets:`, error);
    res.status(500).json({
      error: 'Failed to list assets',
      details: error.message
    });
  }
});

export default router;