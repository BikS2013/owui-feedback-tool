import { Router, Request, Response } from 'express';
import { agentService } from '../services/agent.service.js';
import { databaseService } from '../services/database.service.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       required:
 *         - name
 *         - url
 *         - database_connection_string
 *       properties:
 *         name:
 *           type: string
 *           description: Unique identifier for the agent
 *           example: "Customer Facing"
 *         url:
 *           type: string
 *           description: API endpoint URL for the agent
 *           example: "http://localhost:3001/api/agent1"
 *         database_connection_string:
 *           type: string
 *           description: PostgreSQL connection string for direct database access
 *           example: "postgresql://user:password@localhost:5432/agent1_db"
 *     
 *     Thread:
 *       type: object
 *       properties:
 *         thread_id:
 *           type: string
 *           description: Unique identifier for the thread
 *         thread_ts:
 *           type: string
 *           description: Thread timestamp
 *         channel_id:
 *           type: string
 *           description: Channel identifier
 *         configurable:
 *           type: object
 *           description: Configuration data
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         metadata:
 *           type: object
 *           description: Additional metadata
 *         checkpoint:
 *           type: object
 *           description: Checkpoint data
 *         parent_checkpoint:
 *           type: object
 *           description: Parent checkpoint data
 *     
 *     ThreadPaginatedResponse:
 *       type: object
 *       properties:
 *         threads:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Thread'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               description: Current page number
 *             limit:
 *               type: integer
 *               description: Number of items per page
 *             total:
 *               type: integer
 *               description: Total number of items
 *             totalPages:
 *               type: integer
 *               description: Total number of pages
 */

/**
 * @swagger
 * /api/agent:
 *   get:
 *     summary: Get all configured agents
 *     tags: [Agents]
 *     description: Returns a list of all agents configured in the system
 *     responses:
 *       200:
 *         description: List of agents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 agents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *                 count:
 *                   type: integer
 *                   description: Total number of agents
 *                   example: 3
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve agents"
 *                 message:
 *                   type: string
 *                   example: "Error details"
 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const agents = agentService.getAgents();
    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error retrieving agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/agent/threads:
 *   get:
 *     summary: Get threads from an agent's database
 *     tags: [Agents]
 *     description: Returns paginated thread data from the specified agent's database
 *     parameters:
 *       - in: query
 *         name: agentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the agent whose threads to retrieve
 *         example: "Customer Facing"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: include_retrieved_docs
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include retrieved_docs in the values field of each thread
 *     responses:
 *       200:
 *         description: Threads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ThreadPaginatedResponse'
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Agent name is required"
 *       404:
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Agent not found"
 *       500:
 *         description: Internal server error or database connection error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch threads"
 *                 message:
 *                   type: string
 *                   example: "Error details"
 */
router.get('/threads', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentName, page = '1', limit = '50', include_retrieved_docs } = req.query;

    // Validate agent name
    if (!agentName || typeof agentName !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Agent name is required'
      });
      return;
    }

    // Validate and parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({
        success: false,
        error: 'Invalid page parameter. Must be a positive integer.'
      });
      return;
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 100.'
      });
      return;
    }

    // Get agent by name
    const agent = agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Fetch threads from database
    const includeRetrievedDocs = include_retrieved_docs === 'true';
    const result = await databaseService.getThreads(agent, pageNum, limitNum, includeRetrievedDocs);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threads',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/agent/reload:
 *   post:
 *     summary: Reload agent configuration
 *     tags: [Agents]
 *     description: Reloads the agent configuration from the agent-config.yaml file
 *     responses:
 *       200:
 *         description: Configuration reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Agent configuration reloaded successfully"
 *                 agentsLoaded:
 *                   type: integer
 *                   description: Number of agents loaded
 *                   example: 3
 *       500:
 *         description: Failed to reload configuration
 */
/**
 * @swagger
 * /api/agent/test-connection:
 *   get:
 *     summary: Test database connection for an agent
 *     tags: [Agents]
 *     description: Tests if the database connection for a specific agent is working
 *     parameters:
 *       - in: query
 *         name: agentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the agent to test
 *     responses:
 *       200:
 *         description: Connection test result
 *       400:
 *         description: Bad request - missing agent name
 *       404:
 *         description: Agent not found
 */
router.get('/test-connection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentName } = req.query;

    if (!agentName || typeof agentName !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Agent name is required'
      });
      return;
    }

    const agent = agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    const isConnected = await databaseService.testConnection(agent);
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Database connection successful' : 'Database connection failed',
      agent: agent.name
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/reload', (req: Request, res: Response): void => {
  try {
    agentService.reloadAgents();
    const agents = agentService.getAgents();
    
    res.json({
      success: true,
      message: 'Agent configuration reloaded successfully',
      agentsLoaded: agents.length
    });
  } catch (error) {
    console.error('Error reloading agent configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload agent configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/agent/{name}:
 *   get:
 *     summary: Get a specific agent by name
 *     tags: [Agents]
 *     description: Returns details of a specific agent identified by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the agent to retrieve
 *         example: "Customer Facing"
 *     responses:
 *       200:
 *         description: Agent retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 agent:
 *                   $ref: '#/components/schemas/Agent'
 *       404:
 *         description: Agent not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Agent not found"
 *       500:
 *         description: Internal server error
 */
router.get('/:name', (req: Request, res: Response): void => {
  try {
    const { name } = req.params;
    const agent = agentService.getAgentByName(name);
    
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }
    
    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error retrieving agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const agentRoutes = router;