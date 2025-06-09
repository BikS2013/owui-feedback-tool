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
router.post('/execute-prompt', async (req: Request, res: Response) => {
  try {
    const { llmConfiguration, promptFilePath, conversation } = req.body as LLMPromptExecutionRequest;
    
    // Validate required fields
    if (!llmConfiguration || !promptFilePath || !conversation) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration, promptFilePath, and conversation are required'
      });
    }
    
    // Validate conversation structure
    if (!conversation.id || !conversation.title || !conversation.messages || !Array.isArray(conversation.messages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation structure'
      });
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
router.get('/status/:requestId', async (req: Request, res: Response) => {
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
router.get('/configurations', async (req: Request, res: Response) => {
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
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { configurationName, prompt } = req.body as LLMTestRequest;
    
    if (!configurationName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: configurationName'
      });
    }
    
    // Check if configuration exists
    const config = llmConfigService.getConfiguration(configurationName);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Configuration '${configurationName}' not found`
      });
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
router.post('/reload', async (req: Request, res: Response) => {
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
router.post('/execute-prompt-direct', async (req: Request, res: Response) => {
  try {
    const { llmConfiguration, promptText, parameterValues } = req.body;
    
    // Validate required fields
    if (!llmConfiguration || !promptText || !parameterValues) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: llmConfiguration, promptText, and parameterValues are required'
      });
    }
    
    // Check if configuration exists and is enabled
    const config = llmConfigService.getConfiguration(llmConfiguration);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
    }
    
    if (config.enabled === false) {
      return res.status(400).json({
        success: false,
        error: `Configuration '${llmConfiguration}' is disabled`
      });
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

export { router as llmRoutes };