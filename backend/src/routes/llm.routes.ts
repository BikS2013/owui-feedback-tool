import { Router, Request, Response } from 'express';
import { LLMTestRequest } from '../types/llm.types.js';
import { getExtendedLLMConfigService, getLLMConfigurations, getLLMProvider, getDefaultLLMProvider } from '../services/config/index.js';
import { GitHubService } from '../services/github.service.js';
import { PromptLoader } from '../utils/prompt-loader.js';
import { prepareFilterWithSamplePrompt } from '../services/filterWithSamplePromptService.js';
import { prepareFilterWithoutSamplePrompt } from '../services/filterWithoutSamplePromptService.js';

const router = Router();

// Helper function to get configuration by name
async function getConfigurationByName(name: string): Promise<any> {
  const config = await getLLMConfigurations();
  if (!config || !config.configurations) {
    return null;
  }
  return config.configurations.find(c => c.name === name);
}


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
    console.log('🔍 Fetching LLM configurations...');
    const config = await getLLMConfigurations();
    
    console.log('📋 LLM Config loaded:', JSON.stringify(config, null, 2));
    
    if (!config) {
      console.log('⚠️  No LLM configuration found');
      res.json({
        configurations: [],
        defaultConfiguration: null
      });
      return;
    }
    
    // Return the complete configuration as-is
    const configurations = config.configurations || config.llmProviders || [];
    
    console.log(`✅ Returning ${configurations.length} LLM configurations`);
    
    res.json({
      configurations,
      defaultConfiguration: config.defaultConfiguration || config.defaultProvider || null
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
    
    // Get all configurations and find the requested one
    const config = await getLLMConfigurations();
    if (!config || !config.configurations) {
      res.status(500).json({
        success: false,
        error: 'LLM configurations not available'
      });
      return;
    }
    
    const provider = config.configurations.find(c => c.name === configurationName);
    if (!provider) {
      res.status(404).json({
        success: false,
        error: `Configuration '${configurationName}' not found`
      });
      return;
    }
    
    console.log(`🧪 Testing LLM configuration: ${configurationName}`);
    console.log('📋 Provider config:', JSON.stringify(provider, null, 2));
    
    try {
      // Create the chat model
      const model = await getExtendedLLMConfigService().createChatModel(configurationName);
      
      // Use the provided prompt or a default test prompt
      const testPrompt = prompt || "Hello! Please respond with 'Test successful' to confirm you're working.";
      
      // Execute the test
      const startTime = Date.now();
      const response = await model.invoke(testPrompt);
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
      
      console.log(`✅ LLM test completed in ${duration}ms`);
      
      res.json({
        success: true,
        configuration: configurationName,
        response: result,
        error: null,
        duration
      });
    } catch (error: any) {
      console.error(`❌ LLM test failed:`, error);
      res.json({
        success: false,
        configuration: configurationName,
        response: null,
        error: error.message,
        duration: 0
      });
    }
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
    const llmService = getExtendedLLMConfigService();
    await llmService.reload();
    llmService.clearModelCache(); // Clear cache after reload
    const config = await getLLMConfigurations();
    
    res.json({
      success: true,
      message: 'Configurations reloaded successfully',
      configurationsLoaded: config?.configurations?.length || config?.llmProviders?.length || 0
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
    const provider = await getConfigurationByName(llmConfiguration);
    if (!provider) {
      res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
      return;
    }
    
    if (provider.enabled === false) {
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
    
    // Process the prompt with parameter replacement
    const processedPrompt = PromptLoader.replacePlaceholders(promptText, parameterValues as Record<string, string>);
    
    // Create the chat model
    const model = await getExtendedLLMConfigService().createChatModel(llmConfiguration);
    
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
    const provider = await getConfigurationByName(llmConfiguration);
    if (!provider) {
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
      prompt = await prepareFilterWithSamplePrompt({
        sampleData: JSON.stringify(sampleData, null, 2),
        query: query
      });
    } else {
      // Fall back to schema-based approach with dual-script support
      prompt = await prepareFilterWithoutSamplePrompt({
        query: query
      });
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
    const provider = await getConfigurationByName(llmConfiguration);
    if (!provider) {
      res.status(404).json({
        success: false,
        error: `Configuration '${llmConfiguration}' not found`
      });
      return;
    }
    
    if (provider.enabled === false) {
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
      prompt = await prepareFilterWithSamplePrompt({
        sampleData: JSON.stringify(sampleData, null, 2),
        query: query
      });
    } else {
      // Fall back to schema-based approach with dual-script support
      prompt = await prepareFilterWithoutSamplePrompt({
        query: query
      });
    }
    
    // Create the chat model
    const model = await getExtendedLLMConfigService().createChatModel(llmConfiguration);
    
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