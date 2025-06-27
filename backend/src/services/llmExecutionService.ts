import { ChatOpenAI, AzureChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getLLMConfigurations } from './config/index.js';
import { LLMConfig } from './config/llmConfigService.js';

interface LLMProviderConfig {
  name: string;
  provider: string;
  model: string;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  apiVersion?: string;
  temperature?: number;
  maxTokens?: number;
  // Azure-specific fields
  azureOpenAIEndpoint?: string;
  azureOpenAIApiDeploymentName?: string;
  // Google-specific fields
  maxOutputTokens?: number;
}

export class LLMExecutionService {
  private static instance: LLMExecutionService;
  private modelCache: Map<string, BaseChatModel> = new Map();

  private constructor() {}

  public static getInstance(): LLMExecutionService {
    if (!LLMExecutionService.instance) {
      LLMExecutionService.instance = new LLMExecutionService();
    }
    return LLMExecutionService.instance;
  }

  /**
   * Create a chat model based on configuration name
   */
  public async createChatModel(configurationName: string): Promise<BaseChatModel> {
    // Check cache first
    const cached = this.modelCache.get(configurationName);
    if (cached) {
      console.log(`✅ Using cached model for ${configurationName}`);
      return cached;
    }

    // Get configuration
    const config = await this.getConfigurationByName(configurationName);
    if (!config) {
      throw new Error(`Configuration '${configurationName}' not found`);
    }

    if (!config.enabled) {
      throw new Error(`Configuration '${configurationName}' is disabled`);
    }

    console.log(`🔧 Creating ${config.provider} model: ${config.model}`);
    
    // Create model based on provider
    let model: BaseChatModel;

    switch (config.provider) {
      case 'openai':
        model = this.createOpenAIModel(config);
        break;
      
      case 'azure-openai':
        model = this.createAzureOpenAIModel(config);
        break;
      
      case 'anthropic':
        model = this.createAnthropicModel(config);
        break;
      
      case 'google':
        model = this.createGoogleModel(config);
        break;
      
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Cache the model
    this.modelCache.set(configurationName, model);
    console.log(`✅ Model created and cached for ${configurationName}`);
    
    return model;
  }

  /**
   * Clear cached models
   */
  public clearCache(): void {
    this.modelCache.clear();
    console.log('🧹 Model cache cleared');
  }

  /**
   * Get configuration by name
   */
  private async getConfigurationByName(name: string): Promise<LLMProviderConfig | null> {
    const llmConfig = await getLLMConfigurations();
    if (!llmConfig || !llmConfig.configurations) {
      return null;
    }
    return llmConfig.configurations.find((c: any) => c.name === name) || null;
  }

  /**
   * Create OpenAI model
   */
  private createOpenAIModel(config: LLMProviderConfig): BaseChatModel {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const modelConfig: any = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      apiKey: apiKey,
    };

    if (config.maxTokens) {
      modelConfig.maxTokens = config.maxTokens;
    }

    return new ChatOpenAI(modelConfig);
  }

  /**
   * Create Azure OpenAI model
   */
  private createAzureOpenAIModel(config: LLMProviderConfig): BaseChatModel {
    // Try to get API key from config or environment
    const apiKey = config.apiKey || process.env.AZURE_OPENAI_API_KEY;
    const endpoint = config.endpoint || config.azureOpenAIEndpoint || process.env.AZURE_OPENAI_API_ENDPOINT;
    const apiVersion = config.apiVersion || process.env.AZURE_OPENAI_API_VERSION;
    
    if (!apiKey || !endpoint || !apiVersion) {
      throw new Error('Azure OpenAI requires apiKey, endpoint, and apiVersion');
    }

    const modelConfig: any = {
      azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName || config.model,
      azureOpenAIApiKey: apiKey,
      azureOpenAIApiInstanceName: this.extractInstanceName(endpoint),
      azureOpenAIApiVersion: apiVersion,
      temperature: config.temperature ?? 0.7,
    };

    if (config.maxTokens) {
      modelConfig.maxTokens = config.maxTokens;
    }

    return new AzureChatOpenAI(modelConfig);
  }

  /**
   * Create Anthropic model
   */
  private createAnthropicModel(config: LLMProviderConfig): BaseChatModel {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const modelConfig: any = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      apiKey: apiKey,
    };

    if (config.maxTokens) {
      modelConfig.maxTokens = config.maxTokens;
    }

    return new ChatAnthropic(modelConfig);
  }

  /**
   * Create Google model
   */
  private createGoogleModel(config: LLMProviderConfig): BaseChatModel {
    const apiKey = config.apiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google API key is required');
    }

    const modelConfig: any = {
      model: config.model,
      temperature: config.temperature ?? 0.7,
      apiKey: apiKey,
    };

    if (config.maxOutputTokens) {
      modelConfig.maxOutputTokens = config.maxOutputTokens;
    } else if (config.maxTokens) {
      modelConfig.maxOutputTokens = config.maxTokens;
    }

    return new ChatGoogleGenerativeAI(modelConfig);
  }

  /**
   * Extract instance name from Azure endpoint
   */
  private extractInstanceName(endpoint: string): string {
    // Extract instance name from endpoint like https://instance-name.openai.azure.com/
    const match = endpoint.match(/https?:\/\/([^.]+)\.openai\.azure\.com/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('Invalid Azure OpenAI endpoint format');
  }
}

// Export singleton instance
export const llmExecutionService = LLMExecutionService.getInstance();