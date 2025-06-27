import yaml from 'js-yaml';
import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';
import { llmExecutionService } from '../llmExecutionService.js';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export interface LLMConfig {
  configurations?: Array<{
    name: string;
    provider: string;
    model: string;
    enabled: boolean;
    apiKey?: string;
    endpoint?: string;
    apiVersion?: string;
    temperature?: number;
    maxTokens?: number;
  }>;
  llmProviders?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    apiKey?: string;
    endpoint?: string;
    models?: Array<{
      id: string;
      name: string;
      maxTokens: number;
      temperature?: number;
    }>;
    rateLimits?: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  }>;
  defaultConfiguration?: string;
  defaultProvider?: string;
  defaultModel?: string;
}

export const getLLMConfigService = createLazyConfigService<LLMConfig>(
  () => ({
    sources: [
      createGitHubSource(process.env.LLM_CONFIG_ASSET_KEY || 'config/llm-providers.yaml'),
      createDatabaseSource('llm-config', 'configuration')
    ],
    parser: async (content: string) => yaml.load(content) as LLMConfig,
    verbose: process.env.CONFIG_VERBOSE === 'true'
  }),
  (service, data) => {
  service.configs.set('content', data);
  
  // Store individual providers by ID
  if (data.llmProviders) {
    for (const provider of data.llmProviders) {
      service.configs.set(`provider:${provider.id}`, provider);
    }
  }
  
  // Store default settings
  if (data.defaultProvider) {
    service.configs.set('defaultProvider', data.defaultProvider);
  }
  if (data.defaultModel) {
    service.configs.set('defaultModel', data.defaultModel);
  }
  }
);

// Get all LLM configurations
export async function getLLMConfigurations(): Promise<LLMConfig | null> {
  try {
    const service = getLLMConfigService();
    return await service.getConfig('content');
  } catch (error) {
    console.error('❌ Failed to get LLM configurations:', error);
    throw error;
  }
}

// Get specific provider configuration
export async function getLLMProvider(providerId: string): Promise<any> {
  try {
    const service = getLLMConfigService();
    return await service.getConfig(`provider:${providerId}`);
  } catch (error) {
    console.error(`❌ Failed to get LLM provider ${providerId}:`, error);
    throw error;
  }
}

// Get default LLM provider
export async function getDefaultLLMProvider(): Promise<any> {
  try {
    const service = getLLMConfigService();
    const defaultProviderId = await service.getConfig('defaultProvider');
    if (!defaultProviderId) {
      throw new Error('No default LLM provider configured');
    }
    return await getLLMProvider(defaultProviderId);
  } catch (error) {
    console.error('❌ Failed to get default LLM provider:', error);
    throw error;
  }
}

// Get extended config service with createChatModel method
export function getExtendedLLMConfigService() {
  const baseService = getLLMConfigService();
  return {
    ...baseService,
    createChatModel: async (configurationName: string): Promise<BaseChatModel> => {
      return llmExecutionService.createChatModel(configurationName);
    },
    clearModelCache: () => {
      llmExecutionService.clearCache();
    }
  };
}