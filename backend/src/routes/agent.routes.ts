import { Router, Request, Response } from 'express';
import { agentService } from '../services/agent.service.js';
import { databaseService } from '../services/database.service.js';
import { maskAgentConnectionString, maskAgentsConnectionStrings } from '../utils/connectionStringMasker.js';

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
 *           description: PostgreSQL connection string for direct database access (username and password are masked for security)
 *           example: "postgresql://u**r:********@localhost:5432/agent1_db"
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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const agents = await agentService.getAgents();
    // Mask the database connection strings before sending response
    const maskedAgents = maskAgentsConnectionStrings(agents);
    res.json({
      success: true,
      agents: maskedAgents,
      count: maskedAgents.length
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
 *           maximum: 500
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: include_retrieved_docs
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to include retrieved_docs in the values field of each thread
 *       - in: query
 *         name: fromDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter threads created from this date (inclusive). ISO 8601 format.
 *         example: "2025-01-01T00:00:00Z"
 *       - in: query
 *         name: toDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter threads created until this date (inclusive). ISO 8601 format.
 *         example: "2025-01-31T23:59:59Z"
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
  console.log('🔍 Agent threads endpoint hit with params:', req.query);
  try {
    const { agentName, page = '1', limit = '50', include_retrieved_docs, fromDate, toDate } = req.query;

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

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 500.'
      });
      return;
    }

    // Validate date parameters if provided
    let fromDateTime: Date | undefined;
    let toDateTime: Date | undefined;
    
    if (fromDate && typeof fromDate === 'string') {
      fromDateTime = new Date(fromDate);
      if (isNaN(fromDateTime.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid fromDate parameter. Must be a valid date string.'
        });
        return;
      }
    }
    
    if (toDate && typeof toDate === 'string') {
      toDateTime = new Date(toDate);
      if (isNaN(toDateTime.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid toDate parameter. Must be a valid date string.'
        });
        return;
      }
    }
    
    // Validate date range
    if (fromDateTime && toDateTime && fromDateTime > toDateTime) {
      res.status(400).json({
        success: false,
        error: 'Invalid date range. fromDate must be before toDate.'
      });
      return;
    }

    // Get agent by name
    const agent = await agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Fetch threads from database
    const includeRetrievedDocs = include_retrieved_docs === 'true';
    const result = await databaseService.getThreads(agent, pageNum, limitNum, includeRetrievedDocs, fromDateTime, toDateTime);
    
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
 * /api/agent/thread/{threadId}/documents:
 *   get:
 *     summary: Get documents for a specific thread
 *     tags: [Agents]
 *     description: Returns the retrieved documents associated with a specific thread
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: The thread ID to retrieve documents for
 *         example: "thread_abc123"
 *       - in: query
 *         name: agentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the agent that owns the thread
 *         example: "Customer Facing"
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 threadId:
 *                   type: string
 *                   example: "thread_abc123"
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: Array of retrieved documents
 *       400:
 *         description: Bad request - missing parameters
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
 *         description: Thread or agent not found
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
 *                   example: "Thread not found"
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
 *                   example: "Failed to retrieve documents"
 *                 message:
 *                   type: string
 *                   example: "Error details"
 */
router.get('/thread/:threadId/documents', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Thread documents endpoint hit with params:', req.params, req.query);
  try {
    const { threadId } = req.params;
    const { agentName } = req.query;

    // Validate thread ID
    if (!threadId) {
      res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
      return;
    }

    // Validate agent name
    if (!agentName || typeof agentName !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Agent name is required'
      });
      return;
    }

    // Get agent by name
    const agent = await agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Fetch documents from database
    const documents = await databaseService.getThreadDocuments(agent, threadId);
    
    if (documents === null) {
      res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
      return;
    }

    res.json({
      success: true,
      threadId,
      documents
    });
  } catch (error) {
    console.error('Error fetching thread documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/agent/thread/{threadId}/runs:
 *   get:
 *     summary: Get runs for a specific thread
 *     tags: [Agents]
 *     description: Returns the runs associated with a specific thread
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: The thread ID to retrieve runs for
 *         example: "thread_abc123"
 *       - in: query
 *         name: agentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the agent that owns the thread
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
 *     responses:
 *       200:
 *         description: Runs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 threadId:
 *                   type: string
 *                   example: "thread_abc123"
 *                 data:
 *                   type: object
 *                   properties:
 *                     runs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           run_id:
 *                             type: string
 *                           thread_id:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                           metadata:
 *                             type: object
 *                           config:
 *                             type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: Bad request - missing parameters
 *       404:
 *         description: Thread or agent not found
 *       500:
 *         description: Internal server error
 */
router.get('/thread/:threadId/runs', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Thread runs endpoint hit with params:', req.params, req.query);
  try {
    const { threadId } = req.params;
    const { agentName, page = '1', limit = '50' } = req.query;

    // Validate thread ID
    if (!threadId) {
      res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
      return;
    }

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
    const agent = await agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Fetch runs from database
    const result = await databaseService.getThreadRuns(agent, threadId, pageNum, limitNum);

    res.json({
      success: true,
      threadId,
      data: result
    });
  } catch (error) {
    console.error('Error fetching thread runs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve runs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/agent/thread/{threadId}/checkpoints:
 *   get:
 *     summary: Get checkpoints for a specific thread
 *     tags: [Agents]
 *     description: Returns the checkpoints associated with a specific thread
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *         description: The thread ID to retrieve checkpoints for
 *         example: "thread_abc123"
 *       - in: query
 *         name: agentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the agent that owns the thread
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
 *     responses:
 *       200:
 *         description: Checkpoints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 threadId:
 *                   type: string
 *                   example: "thread_abc123"
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkpoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           thread_id:
 *                             type: string
 *                           checkpoint_id:
 *                             type: string
 *                           run_id:
 *                             type: string
 *                           parent_checkpoint_id:
 *                             type: string
 *                           checkpoint:
 *                             type: object
 *                           metadata:
 *                             type: object
 *                           checkpoint_ns:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: Bad request - missing parameters
 *       404:
 *         description: Thread or agent not found
 *       500:
 *         description: Internal server error
 */
router.get('/thread/:threadId/checkpoints', async (req: Request, res: Response): Promise<void> => {
  console.log('🔍 Thread checkpoints endpoint hit with params:', req.params, req.query);
  try {
    const { threadId } = req.params;
    const { agentName, page = '1', limit = '50' } = req.query;

    // Validate thread ID
    if (!threadId) {
      res.status(400).json({
        success: false,
        error: 'Thread ID is required'
      });
      return;
    }

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
    const agent = await agentService.getAgentByName(agentName);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Fetch checkpoints from database
    const result = await databaseService.getThreadCheckpoints(agent, threadId, pageNum, limitNum);

    res.json({
      success: true,
      threadId,
      data: result
    });
  } catch (error) {
    console.error('Error fetching thread checkpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve checkpoints',
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

    const agent = await agentService.getAgentByName(agentName);
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

router.post('/reload', async (req: Request, res: Response): Promise<void> => {
  try {
    await agentService.reloadAgents();
    const agents = await agentService.getAgents();
    
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
router.get('/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const agent = await agentService.getAgentByName(name);
    
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }
    
    // Mask the database connection string before sending response
    const maskedAgent = maskAgentConnectionString(agent);
    res.json({
      success: true,
      agent: maskedAgent
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

/**
 * @swagger
 * /api/agent/test-connection/{name}:
 *   get:
 *     summary: Test database connection for a specific agent
 *     tags: [Agent]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the agent
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
router.get('/test-connection/:name', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    const agent = await agentService.getAgentByName(name);
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    
    const result = await databaseService.testConnection(agent);
    res.json(result);
  } catch (error: any) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      error: 'Failed to test connection',
      message: error.message
    });
  }
});

export const agentRoutes = router;