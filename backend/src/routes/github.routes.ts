import { Router, Request, Response } from 'express';
import { GitHubService } from '../services/github.service.js';

const router = Router();

// Lazy initialization of GitHub service
let githubService: GitHubService | null = null;
let initError: string | null = null;

const initializeGitHubService = () => {
  if (githubService || initError) return;
  
  try {
    githubService = new GitHubService();
    console.log('✅ GitHub service initialized successfully');
  } catch (error: any) {
    initError = error.message;
    console.warn('⚠️  GitHub service not configured:', error.message);
  }
};

// Middleware to check if GitHub is configured
const requireGitHub = (req: Request, res: Response, next: Function) => {
  // Try to initialize on first request
  initializeGitHubService();
  
  if (!githubService) {
    res.status(503).json({
      error: 'GitHub integration not configured',
      message: initError || 'Please set GITHUB_REPO in environment variables'
    });
    return;
  }
  next();
};

/**
 * @swagger
 * /api/github/status:
 *   get:
 *     summary: Check GitHub connection status
 *     tags: [GitHub]
 *     responses:
 *       200:
 *         description: GitHub connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 repository:
 *                   type: string
 *                   example: "owner/repo"
 *                 dataFolder:
 *                   type: string
 *                   example: "data"
 *                 promptsFolder:
 *                   type: string
 *                   example: "prompts"
 *                 rateLimit:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     reset:
 *                       type: string
 *                       format: date-time
 *                 error:
 *                   type: string
 *       503:
 *         description: GitHub not configured
 */
router.get('/status', requireGitHub, async (req, res): Promise<void> => {
  try {
    const status = await githubService!.checkConnection();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check GitHub status',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/repository:
 *   get:
 *     summary: Get repository information
 *     tags: [GitHub]
 *     responses:
 *       200:
 *         description: Repository information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 name:
 *                   type: string
 *                 full_name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 private:
 *                   type: boolean
 *                 stargazers_count:
 *                   type: number
 *                 language:
 *                   type: string
 *                 default_branch:
 *                   type: string
 */
router.get('/repository', requireGitHub, async (req, res): Promise<void> => {
  try {
    const repoInfo = await githubService!.getRepositoryInfo();
    res.json({ repository: repoInfo }); // Wrap in object to match expected response format
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get repository information',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/files:
 *   get:
 *     summary: List files in a directory
 *     tags: [GitHub]
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: Directory path (optional, defaults to root)
 *     responses:
 *       200:
 *         description: List of files and directories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   path:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [file, dir]
 *                   size:
 *                     type: number
 *                   download_url:
 *                     type: string
 */
router.get('/files', requireGitHub, async (req, res): Promise<void> => {
  try {
    // Support both 'folder' and 'path' query parameters for backwards compatibility
    const path = (req.query.folder as string) || (req.query.path as string) || '';
    const files = await githubService!.getFiles(path);
    res.json({ files }); // Wrap in object to match expected response format
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/tree:
 *   get:
 *     summary: Get repository file tree
 *     tags: [GitHub]
 *     parameters:
 *       - in: query
 *         name: recursive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Fetch tree recursively
 *     responses:
 *       200:
 *         description: Repository tree structure
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sha:
 *                   type: string
 *                 tree:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [blob, tree]
 *                       size:
 *                         type: number
 */
router.get('/tree', requireGitHub, async (req, res): Promise<void> => {
  try {
    const recursive = req.query.recursive !== 'false';
    const tree = await githubService!.getTree('HEAD', recursive);
    res.json({ tree }); // Wrap in object to match expected response format
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get repository tree',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/file/{path}:
 *   get:
 *     summary: Get file content
 *     tags: [GitHub]
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: File path within the repository
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [raw, base64]
 *           default: raw
 *         description: Response format
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                 encoding:
 *                   type: string
 *                 sha:
 *                   type: string
 */
router.get('/file/*', requireGitHub, async (req, res): Promise<void> => {
  try {
    const path = req.params[0];
    const format = req.query.format as string || 'raw';
    
    if (!path) {
      res.status(400).json({ error: 'File path is required' });
      return;
    }
    
    if (format === 'raw') {
      const content = await githubService!.getFileContentAsText(path);
      // Return in expected format
      res.json({
        file: {
          name: path.split('/').pop() || path,
          path: path,
          content: content,
          size: content.length
        }
      });
    } else {
      const fileData = await githubService!.getFileContent(path);
      res.json({
        file: {
          name: path.split('/').pop() || path,
          path: path,
          content: Buffer.from(fileData.content, 'base64').toString('utf-8'),
          size: fileData.size
        }
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get file content',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/search:
 *   get:
 *     summary: Search for files in repository
 *     tags: [GitHub]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: Limit search to specific path
 *       - in: query
 *         name: extension
 *         schema:
 *           type: string
 *         description: Filter by file extension
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 30
 *         description: Maximum results
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   path:
 *                     type: string
 *                   html_url:
 *                     type: string
 */
router.get('/search', requireGitHub, async (req, res): Promise<void> => {
  try {
    const query = req.query.q as string || '';
    
    // Allow empty query if path or extension is specified
    if (!query && !req.query.path && !req.query.extension) {
      res.status(400).json({ error: 'Search query, path, or extension is required' });
      return;
    }
    
    const results = await githubService!.searchFiles(query, {
      path: req.query.path as string,
      extension: req.query.extension as string,
      maxResults: parseInt(req.query.limit as string) || 30
    });
    
    res.json({ files: results });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to search files',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/files-by-extension/{extension}:
 *   get:
 *     summary: List all files with specific extension
 *     tags: [GitHub]
 *     parameters:
 *       - in: path
 *         name: extension
 *         required: true
 *         schema:
 *           type: string
 *         description: File extension (without dot)
 *     responses:
 *       200:
 *         description: List of file paths
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/files-by-extension/:extension', requireGitHub, async (req, res): Promise<void> => {
  try {
    const extension = req.params.extension;
    const files = await githubService!.getFilesByExtension(extension);
    res.json({ files }); // Wrap in object to match expected response format
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get files by extension',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/github/rate-limit:
 *   get:
 *     summary: Get GitHub API rate limit status
 *     tags: [GitHub]
 *     responses:
 *       200:
 *         description: Rate limit information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resources:
 *                   type: object
 *                 rate:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     reset:
 *                       type: number
 *                     used:
 *                       type: number
 */
router.get('/rate-limit', requireGitHub, async (req, res): Promise<void> => {
  try {
    const rateLimit = await githubService!.getRateLimit();
    res.json({ rateLimit }); // Wrap in object to match expected response format
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get rate limit',
      message: error.message
    });
  }
});

export { router as githubRoutes };