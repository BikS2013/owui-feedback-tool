import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { LLMConfiguration } from '../api/llm-client.js';
import { logger } from './logger.js';

/**
 * Extract instance name from Azure endpoint URL
 * e.g., https://instance-name.openai.azure.com/ -> instance-name
 */
function extractInstanceName(endpoint: string): string {
  const match = endpoint.match(/https?:\/\/([^.]+)\.openai\.azure\.com/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error(`Could not extract instance name from endpoint: ${endpoint}`);
}

export function createLLMFromConfig(config: LLMConfiguration, overrides?: { temperature?: number; maxTokens?: number }): any {
  logger.info(`Creating LLM instance for provider: ${config.provider}, model: ${config.model}`);
  
  // Allow overrides for specific use cases like topic identification
  const temperature = overrides?.temperature ?? config.temperature ?? 0.7;
  const maxTokens = overrides?.maxTokens ?? config.maxTokens ?? 1000;
  
  logger.info(`Using temperature: ${temperature}, maxTokens: ${maxTokens}`);
  
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey && !process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found in configuration or OPENAI_API_KEY environment variable');
      }
      return new ChatOpenAI({
        temperature,
        maxTokens,
        modelName: config.model,
        openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
      });
      
    case 'anthropic':
      if (!config.apiKey && !process.env.ANTHROPIC_API_KEY) {
        throw new Error('Anthropic API key not found in configuration or ANTHROPIC_API_KEY environment variable');
      }
      return new ChatAnthropic({
        temperature,
        maxTokens,
        modelName: config.model,
        anthropicApiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      });
      
    case 'google':
      if (!config.apiKey && !process.env.GOOGLE_API_KEY) {
        throw new Error('Google API key not found in configuration or GOOGLE_API_KEY environment variable');
      }
      return new ChatGoogleGenerativeAI({
        temperature,
        maxOutputTokens: maxTokens,
        modelName: config.model,
        apiKey: config.apiKey || process.env.GOOGLE_API_KEY,
      });
      
    case 'azure-openai':
      // Match backend's environment variable names
      const azureApiKey = config.apiKey || process.env.AZURE_OPENAI_API_KEY;
      const azureEndpoint = config.endpoint || config.azureOpenAIEndpoint || process.env.AZURE_OPENAI_API_ENDPOINT;
      const azureApiVersion = config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
      const azureDeploymentName = config.azureOpenAIApiDeploymentName || config.model || process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
      
      if (!azureApiKey) {
        throw new Error('Azure OpenAI API key not found in configuration or AZURE_OPENAI_API_KEY environment variable');
      }
      if (!azureEndpoint) {
        throw new Error('Azure OpenAI endpoint not found in configuration or AZURE_OPENAI_API_ENDPOINT environment variable');
      }
      
      // Extract instance name from endpoint
      const azureInstanceName = extractInstanceName(azureEndpoint);
      logger.info(`Extracted Azure instance name: ${azureInstanceName} from endpoint: ${azureEndpoint}`);
      
      return new AzureChatOpenAI({
        temperature,
        maxTokens,
        azureOpenAIApiKey: azureApiKey,
        azureOpenAIApiInstanceName: azureInstanceName,
        azureOpenAIApiDeploymentName: azureDeploymentName,
        azureOpenAIApiVersion: azureApiVersion,
      });
      
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}