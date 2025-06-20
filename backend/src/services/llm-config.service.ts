import yaml from 'js-yaml';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AzureChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { 
  LLMConfig, 
  LLMConfigFile, 
  OpenAIConfig, 
  AnthropicConfig, 
  GoogleConfig, 
  AzureOpenAIConfig, 
  LiteLLMConfig, 
  OllamaConfig 
} from '../types/llm.types.js';
import { ConfigService } from './config-service-template.js';

interface LLMConfigData extends LLMConfigFile {
  defaultConfiguration?: string;
}

export class LLMConfigService extends ConfigService<LLMConfigData> {
  private defaultConfig: string | null = null;

  constructor() {
    super(
      process.env.LLM_CONFIG_ASSET_KEY || 'settings/llm-config.yaml',
      'llm-config.yaml',
      (content) => {
        try {
          return yaml.load(content) as LLMConfigData;
        } catch (error) {
          console.error('❌ Failed to parse YAML:', error);
          throw new Error(`Invalid YAML format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }

  protected processConfiguration(data: LLMConfigData): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Configuration file is empty or not an object');
    }

    if (!data.configurations || !Array.isArray(data.configurations)) {
      throw new Error('Invalid configuration file format: missing or invalid "configurations" array');
    }

    // Clear existing configurations
    this.configs.clear();
    
    // Load all enabled configurations
    for (const config of data.configurations) {
      if (config.enabled !== false) { // Default to enabled if not specified
        this.configs.set(config.name, config);
      }
    }

    // Set default configuration
    if (data.defaultConfiguration) {
      this.defaultConfig = data.defaultConfiguration;
    } else if (this.configs.size > 0) {
      this.defaultConfig = this.configs.keys().next().value || null;
    }

    console.log(`✅ Loaded ${this.configs.size} LLM configurations`);
    console.log(`   Default: ${this.defaultConfig}`);
  }

  /**
   * Get all available configurations
   */
  async getConfigurations(): Promise<LLMConfig[]> {
    await this.getAll(); // Ensures initialization
    return Array.from(this.configs.values());
  }

  /**
   * Get configuration names
   */
  async getConfigurationNames(): Promise<string[]> {
    await this.getAll(); // Ensures initialization
    return Array.from(this.configs.keys());
  }

  /**
   * Get a specific configuration
   */
  async getConfiguration(name: string): Promise<LLMConfig | null> {
    return await this.getConfig(name) || null;
  }

  /**
   * Get default configuration name
   */
  async getDefaultConfigurationName(): Promise<string | null> {
    await this.getAll(); // Ensures initialization
    return this.defaultConfig;
  }

  /**
   * Create a LangChain chat model from configuration
   */
  async createChatModel(configName: string): Promise<BaseChatModel> {
    const config = await this.getConfiguration(configName);
    if (!config) {
      throw new Error(`Configuration '${configName}' not found`);
    }

    if (config.enabled === false) {
      throw new Error(`Configuration '${configName}' is disabled`);
    }

    switch (config.provider) {
      case 'openai':
        return this.createOpenAIModel(config as OpenAIConfig);
      
      case 'anthropic':
        return this.createAnthropicModel(config as AnthropicConfig);
      
      case 'google':
        return this.createGoogleModel(config as GoogleConfig);
      
      case 'azure-openai':
        return this.createAzureOpenAIModel(config as AzureOpenAIConfig);
      
      case 'litellm':
        return this.createLiteLLMModel(config as LiteLLMConfig);
      
      case 'ollama':
        return this.createOllamaModel(config as OllamaConfig);
      
      default:
        throw new Error(`Unsupported provider: ${(config as any).provider}`);
    }
  }

  private createOpenAIModel(config: OpenAIConfig): ChatOpenAI {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    return new ChatOpenAI({
      modelName: config.model,
      openAIApiKey: apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      ...(config.baseURL && { configuration: { baseURL: config.baseURL } })
    });
  }

  private createAnthropicModel(config: AnthropicConfig): ChatAnthropic {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    return new ChatAnthropic({
      modelName: config.model,
      anthropicApiKey: apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
  }

  private createGoogleModel(config: GoogleConfig): ChatGoogleGenerativeAI {
    const apiKey = config.apiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not configured. Set GOOGLE_API_KEY environment variable.');
    }

    return new ChatGoogleGenerativeAI({
      model: config.model,
      apiKey: apiKey,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens
    });
  }

  private createAzureOpenAIModel(config: AzureOpenAIConfig): AzureChatOpenAI {
    const apiKey = config.apiKey || process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Azure OpenAI API key not configured. Set AZURE_OPENAI_API_KEY environment variable.');
    }

    return new AzureChatOpenAI({
      azureOpenAIApiKey: apiKey,
      azureOpenAIApiVersion: config.apiVersion,
      azureOpenAIEndpoint: config.azureOpenAIEndpoint,
      azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
  }

  private createLiteLLMModel(config: LiteLLMConfig): ChatOpenAI {
    // LiteLLM uses OpenAI-compatible API
    const apiKey = config.apiKey || process.env.LITELLM_API_KEY || 'dummy-key';
    
    return new ChatOpenAI({
      modelName: config.model,
      openAIApiKey: apiKey,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      configuration: {
        baseURL: config.apiBase
      }
    });
  }

  private createOllamaModel(config: OllamaConfig): ChatOllama {
    return new ChatOllama({
      model: config.model,
      baseUrl: config.baseUrl || 'http://localhost:11434',
      temperature: config.temperature,
      numPredict: config.numPredict
    });
  }

  /**
   * Test a configuration with a simple prompt
   */
  async testConfiguration(configName: string, prompt?: string): Promise<{ success: boolean; response?: string; error?: string; duration: number }> {
    const startTime = Date.now();
    const testPrompt = prompt || "Hello! Please respond with a brief greeting.";
    
    try {
      const model = await this.createChatModel(configName);
      const response = await model.invoke(testPrompt);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        response: response.content.toString(),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error.message || 'Unknown error',
        duration
      };
    }
  }

  /**
   * Reload configurations from file
   */
  async reloadConfigurations(): Promise<void> {
    this.defaultConfig = null;
    await this.reload();
  }
}

// Export singleton instance with lazy initialization
let instance: LLMConfigService | null = null;

export const getLLMConfigService = (): LLMConfigService => {
  if (!instance) {
    console.log('🎯 Creating LLMConfigService instance...');
    console.log(`   LLM_CONFIG_ASSET_KEY at creation time: ${process.env.LLM_CONFIG_ASSET_KEY}`);
    instance = new LLMConfigService();
  }
  return instance;
};

// Note: Direct proxy export removed to fix initialization issues
// Always use getLLMConfigService() instead