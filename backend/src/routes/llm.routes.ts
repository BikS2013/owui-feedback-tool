import { Router, Request, Response } from 'express';
import { LLMPromptExecutionRequest, LLMPromptExecutionResponse, LLMTestRequest } from '../types/llm.types.js';
import { v4 as uuidv4 } from 'uuid';
import { llmConfigService } from '../services/llm-config.service.js';
import { GitHubService } from '../services/github.service.js';

const router = Router();

/**
 * @swagger
 * /api/llm/execute-prompt:
 *   post:
 *     summary: Execute a prompt from GitHub against a conversation using an LLM
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - llmConfiguration
 *               - promptFilePath
 *               - conversation
 *             properties:
 *               llmConfiguration:
 *                 type: string
 *                 description: The name of the LLM configuration to use
 *                 example: "gpt-4"
 *               promptFilePath:
 *                 type: string
 *                 description: The full path of the prompt file in the GitHub repository
 *                 example: "prompts/analysis/conversation-summary.md"
 *               conversation:
 *                 type: object
 *                 description: The complete conversation JSON
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           enum: [user, assistant]
 *                         content:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *     responses:
 *       200:
 *         description: Prompt execution request accepted
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
 *                   example: "Prompt execution request accepted"
 *                 requestId:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Invalid request
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
 *                   example: "Missing required fields"
 *       500:
 *         description: Server error
 */
router.post('/execute-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { llmConfiguration, promptFilePath, conversation } = req.body as LLMPromptExecutionRequest;
    
    // Validate required fields
    if (!llmConfiguration || !promptFilePath || !conversation) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration, promptFilePath, and conversation are required'
      });
      return;
    }
    
    // Validate conversation structure
    if (!conversation.id || !conversation.title || !conversation.messages || !Array.isArray(conversation.messages)) {
      res.status(400).json({
        success: false,
        error: 'Invalid conversation structure'
      });
      return;
    }
    
    // Generate a request ID for tracking
    const requestId = uuidv4();
    
    // Log the request details
    console.log('📨 LLM Prompt Execution Request:');
    console.log(`   • Request ID: ${requestId}`);
    console.log(`   • LLM Configuration: ${llmConfiguration}`);
    console.log(`   • Prompt File: ${promptFilePath}`);
    console.log(`   • Conversation: ${conversation.title} (${conversation.messages.length} messages)`);
    
    // TODO: In the future, this will:
    // 1. Fetch the prompt file from GitHub using the GitHub service
    // 2. Process the prompt with the conversation context
    // 3. Send to the configured LLM
    // 4. Return the result
    
    // For now, return acknowledgment
    const response: LLMPromptExecutionResponse = {
      success: true,
      message: 'Prompt execution request accepted',
      requestId
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error in execute-prompt endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/status/{requestId}:
 *   get:
 *     summary: Get the status of a prompt execution request
 *     tags: [LLM]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The request ID returned from execute-prompt
 *     responses:
 *       200:
 *         description: Request status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 result:
 *                   type: string
 *                   description: The LLM response (when completed)
 *                 error:
 *                   type: string
 *                   description: Error message (when failed)
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Request not found
 */
router.get('/status/:requestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    
    // TODO: Implement actual status tracking
    // For now, return a mock response
    res.json({
      requestId,
      status: 'pending',
      message: 'Status tracking not yet implemented',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in status endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/configurations:
 *   get:
 *     summary: Get all available LLM configurations
 *     tags: [LLM]
 *     responses:
 *       200:
 *         description: List of available LLM configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configurations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       provider:
 *                         type: string
 *                         enum: [openai, anthropic, google, azure-openai, litellm, ollama]
 *                       model:
 *                         type: string
 *                       description:
 *                         type: string
 *                       enabled:
 *                         type: boolean
 *                 defaultConfiguration:
 *                   type: string
 *                   description: Name of the default configuration
 */
router.get('/configurations', async (req: Request, res: Response): Promise<void> => {
  try {
    const configurations = llmConfigService.getConfigurations();
    const defaultConfiguration = llmConfigService.getDefaultConfigurationName();
    
    res.json({
      configurations: configurations.map(config => ({
        name: config.name,
        provider: config.provider,
        model: config.model,
        description: config.description,
        enabled: config.enabled !== false
      })),
      defaultConfiguration
    });
  } catch (error: any) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/test:
 *   post:
 *     summary: Test an LLM configuration with a simple prompt
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configurationName
 *             properties:
 *               configurationName:
 *                 type: string
 *                 description: Name of the LLM configuration to test
 *                 example: "gpt-3.5-turbo"
 *               prompt:
 *                 type: string
 *                 description: Optional prompt to test (defaults to a greeting)
 *                 example: "Tell me a short story about a robot"
 *     responses:
 *       200:
 *         description: Test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 configuration:
 *                   type: string
 *                 response:
 *                   type: string
 *                   description: LLM response (if successful)
 *                 error:
 *                   type: string
 *                   description: Error message (if failed)
 *                 duration:
 *                   type: number
 *                   description: Response time in milliseconds
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Configuration not found
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { configurationName, prompt } = req.body as LLMTestRequest;
    
    if (!configurationName) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: configurationName'
      });
      return;
    }
    
    // Check if configuration exists
    const config = llmConfigService.getConfiguration(configurationName);
    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration '${configurationName}' not found`
      });
      return;
    }
    
    console.log(`🧪 Testing LLM configuration: ${configurationName}`);
    const result = await llmConfigService.testConfiguration(configurationName, prompt);
    
    res.json({
      success: result.success,
      configuration: configurationName,
      response: result.response,
      error: result.error,
      duration: result.duration
    });
  } catch (error: any) {
    console.error('Error testing LLM:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/reload:
 *   post:
 *     summary: Reload LLM configurations from file
 *     tags: [LLM]
 *     responses:
 *       200:
 *         description: Configurations reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 configurationsLoaded:
 *                   type: number
 */
router.post('/reload', async (req: Request, res: Response): Promise<void> => {
  try {
    llmConfigService.reloadConfigurations();
    const configurations = llmConfigService.getConfigurations();
    
    res.json({
      success: true,
      message: 'Configurations reloaded successfully',
      configurationsLoaded: configurations.length
    });
  } catch (error: any) {
    console.error('Error reloading configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload configurations',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/execute-prompt-direct:
 *   post:
 *     summary: Execute a prompt directly with parameter values
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - llmConfiguration
 *               - promptText
 *               - parameterValues
 *             properties:
 *               llmConfiguration:
 *                 type: string
 *                 description: The name of the LLM configuration to use
 *                 example: "gpt-4"
 *               promptText:
 *                 type: string
 *                 description: The prompt text with parameter placeholders
 *                 example: "Summarize this conversation: {conversation}"
 *               parameterValues:
 *                 type: object
 *                 description: Key-value pairs for parameter substitution
 *                 example:
 *                   conversation: "[conversation JSON]"
 *                   currentDate: "2024-01-20"
 *     responses:
 *       200:
 *         description: Prompt execution completed
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
 *                   example: "Prompt executed successfully"
 *                 result:
 *                   type: string
 *                   example: "The conversation summary is..."
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/execute-prompt-direct', async (req: Request, res: Response): Promise<void> => {
  try {
    const { llmConfiguration, promptText, parameterValues } = req.body;
    
    // Validate required fields
    if (!llmConfiguration || !promptText || !parameterValues) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration, promptText, and parameterValues are required'
      });
      return;
    }
    
    // Check if configuration exists and is enabled
    const config = llmConfigService.getConfiguration(llmConfiguration);
    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
      return;
    }
    
    if (config.enabled === false) {
      res.status(400).json({
        success: false,
        error: `Configuration '${llmConfiguration}' is disabled`
      });
      return;
    }
    
    console.log('🚀 Direct Prompt Execution Request:');
    console.log(`   • LLM Configuration: ${llmConfiguration}`);
    console.log(`   • Prompt length: ${promptText.length} characters`);
    console.log(`   • Parameters provided: ${Object.keys(parameterValues).join(', ')}`);
    
    // Replace parameters in the prompt
    let processedPrompt = promptText;
    for (const [key, value] of Object.entries(parameterValues)) {
      const placeholder = `{${key}}`;
      processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), value);
    }
    
    // Create the chat model
    const model = llmConfigService.createChatModel(llmConfiguration);
    
    // Execute the prompt
    const startTime = Date.now();
    const response = await model.invoke(processedPrompt);
    const duration = Date.now() - startTime;
    
    // Extract the response content
    let result: string;
    if (typeof response.content === 'string') {
      result = response.content;
    } else if (Array.isArray(response.content)) {
      result = response.content.map((item: any) => 
        typeof item === 'string' ? item : item.text || ''
      ).join('');
    } else {
      result = String(response.content);
    }
    
    console.log(`✅ Prompt executed successfully in ${duration}ms`);
    
    res.json({
      success: true,
      message: 'Prompt executed successfully',
      result
    });
  } catch (error: any) {
    console.error('Error in execute-prompt-direct endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute prompt',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/llm/convert-to-filter:
 *   post:
 *     summary: Convert natural language query to filter expression
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - llmConfiguration
 *               - query
 *             properties:
 *               llmConfiguration:
 *                 type: string
 *                 description: The name of the LLM configuration to use
 *                 example: "gpt-4"
 *               query:
 *                 type: string
 *                 description: The natural language query to convert
 *                 example: "Show me conversations from last week with ratings above 7"
 *               sampleData:
 *                 type: object
 *                 description: Optional sample data object to guide the LLM. When provided, the LLM will use this to understand the data structure better.
 *                 example: {
 *                   "thread_id": "abc123",
 *                   "created_at": "2024-01-10T10:00:00Z",
 *                   "values": {
 *                     "messages": [
 *                       {
 *                         "type": "human",
 *                         "content": "Hello"
 *                       }
 *                     ]
 *                   }
 *                 }
 *     responses:
 *       200:
 *         description: Filter expression generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 filterExpression:
 *                   type: object
 *                   description: The generated filter expression
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           nullable: true
 *                         end:
 *                           type: string
 *                           nullable: true
 *                     ratingFilter:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         includeUnrated:
 *                           type: boolean
 *                     filterLevel:
 *                       type: string
 *                       enum: [conversation, qa]
 *                     modelFilter:
 *                       type: array
 *                       items:
 *                         type: string
 *                     customConditions:
 *                       type: object
 *                 responseType:
 *                   type: string
 *                   description: The type of response generated
 *                   enum: [filter, render, both, json, unknown]
 *                   example: "both"
 *                 filterCode:
 *                   type: string
 *                   description: Generated JavaScript filter code (legacy - same as filterScript)
 *                   example: "function filterThreads(threads) { return threads.filter(thread => { return thread.created_at > '2024-01-01'; }); }"
 *                 filterScript:
 *                   type: string
 *                   description: Generated JavaScript filter function
 *                   example: "function filterThreads(threads) { return threads.filter(thread => { return thread.created_at > '2024-01-01'; }); }"
 *                 renderScript:
 *                   type: string
 *                   description: Generated JavaScript render function for markdown or graphs
 *                   example: "function renderContent(threads) { return `# Report\\n\\nTotal: ${threads.length} conversations`; }"
 *                 rawResponse:
 *                   type: string
 *                   description: The raw LLM response for debugging
 *                 usedSampleData:
 *                   type: boolean
 *                   description: Whether sample data was used to generate the scripts
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/llm/get-prompt:
 *   post:
 *     summary: Get the prompt that will be sent to the LLM for filter generation
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - llmConfiguration
 *               - query
 *             properties:
 *               llmConfiguration:
 *                 type: string
 *                 description: The name of the LLM configuration to use
 *                 example: "gpt-4"
 *               query:
 *                 type: string
 *                 description: The natural language query
 *                 example: "Show me conversations from last week with ratings above 7"
 *               sampleData:
 *                 type: object
 *                 description: Optional sample data to help generate more accurate prompts
 *     responses:
 *       200:
 *         description: Prompt generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 prompt:
 *                   type: string
 *                   description: The generated prompt
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Configuration not found
 */
router.post('/get-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { llmConfiguration, query, sampleData } = req.body;
    
    // Validate required fields
    if (!llmConfiguration || !query) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration and query are required'
      });
      return;
    }
    
    // Check if configuration exists
    const config = llmConfigService.getConfiguration(llmConfiguration);
    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
      return;
    }
    
    console.log('📋 Prompt Generation Request:');
    console.log(`   • LLM Configuration: ${llmConfiguration}`);
    console.log(`   • Query: ${query}`);
    console.log(`   • Sample data provided: ${sampleData ? 'Yes' : 'No'}`);
    
    // Build the prompt with sample data if provided
    let prompt = '';
    
    if (sampleData) {
      // Use actual sample data to guide the LLM
      prompt = `You are a JavaScript code generator for processing LangGraph conversation data. Based on the user's query, generate one or both types of scripts:

1. FILTER SCRIPT: For narrowing down the conversation list
2. RENDER SCRIPT: For creating visualizations (markdown or graphs)

IMPORTANT: The complete dataset is an array of objects similar to the sample provided below.

SAMPLE DATA (one object from the array):
${JSON.stringify(sampleData, null, 2)}

DATASET STRUCTURE:
The complete dataset is an array of similar objects. Each object represents a conversation thread with:
- thread_id: unique identifier
- created_at/updated_at: timestamps
- values.messages: array of conversation messages
- values.retrieved_docs: array of retrieved documents (if any)
- Other fields as shown in the sample

NATURAL LANGUAGE QUERY: "${query}"

ANALYZE THE QUERY AND GENERATE APPROPRIATE SCRIPTS:

If filtering is needed, create:
function filterThreads(threads) {
  // Your filtering logic here
  return threads.filter(thread => {
    // Conditions based on user query
  });
}

If visualization is needed, create:
function renderContent(threads) {
  // For markdown rendering:
  return \`# Report Title\\n\\nContent here...\`;
  
  // OR for graph rendering:
  return {
    type: 'bar', // or 'line', 'pie', etc.
    data: {
      labels: [...],
      datasets: [...]
    },
    options: {...}
  };
}

RESPONSE FORMAT:
{
  "filterScript": "...", // Include if filtering needed
  "renderScript": "..."  // Include if visualization needed
}

IMPORTANT RULES:
- Generate ONLY the needed scripts based on query intent
- Use only safe JavaScript features (no eval, fetch, or DOM manipulation)
- Include helpful comments explaining the logic
- For graphs, use Chart.js compatible format
- For markdown, use GitHub-flavored markdown
- Return a valid JSON object with the appropriate scripts`;
    } else {
      // Fall back to schema-based approach with dual-script support
      prompt = `You are a JavaScript code generator for processing conversation data. Based on the user's query, generate one or both types of scripts:

1. FILTER SCRIPT: For narrowing down the conversation list
2. RENDER SCRIPT: For creating visualizations (markdown or graphs)

DATA SCHEMA:
The dataset is an array of conversation objects with this structure:
{
  "thread_id": "string - unique identifier",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp (optional)",
  "metadata": {
    "user_id": "string (optional)",
    // other metadata fields
  },
  "values": {
    "messages": [
      {
        "type": "human | ai | string",
        "content": "string or object with text field",
        "text": "string (alternative to content)",
        "timestamp": "string or number",
        "response_metadata": {
          "model_name": "string (optional)"
        },
        "model": "string (optional)"
      }
    ],
    "retrieved_docs": [ // optional array
      {
        "page_content": "string",
        "metadata": {
          "source": "string",
          "title": "string",
          "url": "string"
        }
      }
    ]
  }
}

NATURAL LANGUAGE QUERY: "${query}"

ANALYZE THE QUERY AND GENERATE APPROPRIATE SCRIPTS:

If filtering is needed, create:
function filterThreads(threads) {
  // Your filtering logic here
  return threads.filter(thread => {
    // Conditions based on user query
  });
}

If visualization is needed, create:
function renderContent(threads) {
  // For markdown rendering:
  return \`# Report Title\\n\\nContent here...\`;
  
  // OR for graph rendering:
  return {
    type: 'bar', // or 'line', 'pie', etc.
    data: {
      labels: [...],
      datasets: [...]
    },
    options: {...}
  };
}

RESPONSE FORMAT:
{
  "filterScript": "...", // Include if filtering needed
  "renderScript": "..."  // Include if visualization needed
}

IMPORTANT RULES:
- Generate ONLY the needed scripts based on query intent
- Use only safe JavaScript features (no eval, fetch, or DOM manipulation)
- Include helpful comments explaining the logic
- For graphs, use Chart.js compatible format
- For markdown, use GitHub-flavored markdown
- Return a valid JSON object with the appropriate scripts

QUERY INTENT DETECTION:
- FILTERING: "show", "find", "filter", "get", "search", "from", "with", "where"
- VISUALIZATION: "render", "graph", "chart", "plot", "visualize", "create", "display", "summary", "report"
- If unsure, prefer generating a render script for visualization queries`;
    }
    
    console.log('✅ Prompt generated successfully');
    
    res.json({
      success: true,
      prompt
    });
  } catch (error: any) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prompt',
      message: error.message
    });
  }
});

router.post('/convert-to-filter', async (req: Request, res: Response): Promise<void> => {
  try {
    const { llmConfiguration, query, sampleData } = req.body;
    
    // Validate required fields
    if (!llmConfiguration || !query) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration and query are required'
      });
      return;
    }
    
    // Check if configuration exists and is enabled
    const config = llmConfigService.getConfiguration(llmConfiguration);
    if (!config) {
      res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
      return;
    }
    
    if (config.enabled === false) {
      res.status(400).json({
        success: false,
        error: `Configuration '${llmConfiguration}' is disabled`
      });
      return;
    }
    
    console.log('🔍 Natural Language to Filter/Render Conversion Request:');
    console.log(`   • LLM Configuration: ${llmConfiguration}`);
    console.log(`   • Query: ${query}`);
    console.log(`   • Sample data provided: ${sampleData ? 'Yes' : 'No'}`);
    
    // Build the prompt with sample data if provided
    let prompt = '';
    
    if (sampleData) {
      // Use actual sample data to guide the LLM
      prompt = `You are a JavaScript code generator for processing LangGraph conversation data. Based on the user's query, generate one or both types of scripts:

1. FILTER SCRIPT: For narrowing down the conversation list
2. RENDER SCRIPT: For creating visualizations (markdown or graphs)

IMPORTANT: The complete dataset is an array of objects similar to the sample provided below.

SAMPLE DATA (one object from the array):
${JSON.stringify(sampleData, null, 2)}

DATASET STRUCTURE:
The complete dataset is an array of similar objects. Each object represents a conversation thread with:
- thread_id: unique identifier
- created_at/updated_at: timestamps
- values.messages: array of conversation messages
- values.retrieved_docs: array of retrieved documents (if any)
- Other fields as shown in the sample

NATURAL LANGUAGE QUERY: "${query}"

ANALYZE THE QUERY AND GENERATE APPROPRIATE SCRIPTS:

If filtering is needed, create:
function filterThreads(threads) {
  // Your filtering logic here
  return threads.filter(thread => {
    // Conditions based on user query
  });
}

If visualization is needed, create:
function renderContent(threads) {
  // For markdown rendering:
  return \`# Report Title\\n\\nContent here...\`;
  
  // OR for graph rendering:
  return {
    type: 'bar', // or 'line', 'pie', etc.
    data: {
      labels: [...],
      datasets: [...]
    },
    options: {...}
  };
}

RESPONSE FORMAT:
{
  "filterScript": "...", // Include if filtering needed
  "renderScript": "..."  // Include if visualization needed
}

IMPORTANT RULES:
- Generate ONLY the needed scripts based on query intent
- Use only safe JavaScript features (no eval, fetch, or DOM manipulation)
- Include helpful comments explaining the logic
- For graphs, use Chart.js compatible format
- For markdown, use GitHub-flavored markdown
- Return a valid JSON object with the appropriate scripts`;
    } else {
      // Fall back to schema-based approach with dual-script support
      prompt = `You are a JavaScript code generator for processing conversation data. Based on the user's query, generate one or both types of scripts:

1. FILTER SCRIPT: For narrowing down the conversation list
2. RENDER SCRIPT: For creating visualizations (markdown or graphs)

DATA SCHEMA:
The dataset is an array of conversation objects with this structure:
{
  "thread_id": "string - unique identifier",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp (optional)",
  "metadata": {
    "user_id": "string (optional)",
    // other metadata fields
  },
  "values": {
    "messages": [
      {
        "type": "human | ai | string",
        "content": "string or object with text field",
        "text": "string (alternative to content)",
        "timestamp": "string or number",
        "response_metadata": {
          "model_name": "string (optional)"
        },
        "model": "string (optional)"
      }
    ],
    "retrieved_docs": [ // optional array
      {
        "page_content": "string",
        "metadata": {
          "source": "string",
          "title": "string",
          "url": "string"
        }
      }
    ]
  }
}

NATURAL LANGUAGE QUERY: "${query}"

ANALYZE THE QUERY AND GENERATE APPROPRIATE SCRIPTS:

If filtering is needed, create:
function filterThreads(threads) {
  // Your filtering logic here
  return threads.filter(thread => {
    // Conditions based on user query
  });
}

If visualization is needed, create:
function renderContent(threads) {
  // For markdown rendering:
  return \`# Report Title\\n\\nContent here...\`;
  
  // OR for graph rendering:
  return {
    type: 'bar', // or 'line', 'pie', etc.
    data: {
      labels: [...],
      datasets: [...]
    },
    options: {...}
  };
}

RESPONSE FORMAT:
{
  "filterScript": "...", // Include if filtering needed
  "renderScript": "..."  // Include if visualization needed
}

IMPORTANT RULES:
- Generate ONLY the needed scripts based on query intent
- Use only safe JavaScript features (no eval, fetch, or DOM manipulation)
- Include helpful comments explaining the logic
- For graphs, use Chart.js compatible format
- For markdown, use GitHub-flavored markdown
- Return a valid JSON object with the appropriate scripts

QUERY INTENT DETECTION:
- FILTERING: "show", "find", "filter", "get", "search", "from", "with", "where"
- VISUALIZATION: "render", "graph", "chart", "plot", "visualize", "create", "display", "summary", "report"
- If unsure, prefer generating a render script for visualization queries`;
    }
    
    // Create the chat model
    const model = llmConfigService.createChatModel(llmConfiguration);
    
    // Execute the prompt
    const startTime = Date.now();
    const response = await model.invoke(prompt);
    const duration = Date.now() - startTime;
    
    // Extract the response content
    let rawResponse: string;
    if (typeof response.content === 'string') {
      rawResponse = response.content;
    } else if (Array.isArray(response.content)) {
      rawResponse = response.content.map((item: any) => 
        typeof item === 'string' ? item : item.text || ''
      ).join('');
    } else {
      rawResponse = String(response.content);
    }
    
    console.log(`✅ Script generation completed in ${duration}ms`);
    
    // Determine response type and handle accordingly
    let filterScript = null;
    let renderScript = null;
    let responseType = 'unknown';
    
    // Try to parse as JSON with dual scripts
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Check for dual-script format
        if (parsed.filterScript || parsed.renderScript) {
          filterScript = parsed.filterScript || null;
          renderScript = parsed.renderScript || null;
          
          // Determine response type based on what scripts are present
          if (filterScript && renderScript) {
            responseType = 'both';
          } else if (filterScript) {
            responseType = 'filter';
          } else if (renderScript) {
            responseType = 'render';
          }
          
          console.log(`📄 Response type: ${responseType}`);
          if (filterScript) console.log('   • Filter script: ✓');
          if (renderScript) console.log('   • Render script: ✓');
        }
      }
    } catch (parseError) {
      // Fall back to checking for raw JavaScript code
      if (rawResponse.includes('function filterThreads') || rawResponse.includes('function processThreads')) {
        responseType = 'filter';
        filterScript = rawResponse;
        console.log('📄 Response type: Raw JavaScript filter');
      } else {
        console.error('Failed to parse response:', parseError);
      }
    }
    
    res.json({
      success: true,
      responseType,
      filterScript,
      renderScript,
      rawResponse,
      usedSampleData: !!sampleData
    });
  } catch (error: any) {
    console.error('Error in convert-to-filter endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert query to filter',
      message: error.message
    });
  }
});

export { router as llmRoutes };