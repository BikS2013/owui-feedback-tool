import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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

export class LLMConfigService {
  private configs: Map<string, LLMConfig> = new Map();
  private defaultConfig: string | null = null;
  private configPath: string;

  constructor() {
    this.configPath = join(process.cwd(), 'llm-config.yaml');
    this.loadConfigurations();
  }

  /**
   * Load configurations from YAML file
   */
  private loadConfigurations(): void {
    try {
      if (!existsSync(this.configPath)) {
        console.warn('⚠️  LLM configuration file not found. Using default configuration.');
        // Create a minimal default configuration
        const defaultConfig: LLMConfig = {
          name: 'default',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          description: 'Default OpenAI configuration',
          enabled: true,
          temperature: 0.7,
          maxTokens: 1000
        } as OpenAIConfig;
        
        this.configs.set('default', defaultConfig);
        this.defaultConfig = 'default';
        return;
      }

      const fileContents = readFileSync(this.configPath, 'utf8');
      const configData = yaml.load(fileContents) as LLMConfigFile & { defaultConfiguration?: string };

      if (!configData.configurations || !Array.isArray(configData.configurations)) {
        throw new Error('Invalid configuration file format');
      }

      // Load all configurations
      for (const config of configData.configurations) {
        if (config.enabled !== false) { // Default to enabled if not specified
          this.configs.set(config.name, config);
        }
      }

      // Set default configuration
      if (configData.defaultConfiguration) {
        this.defaultConfig = configData.defaultConfiguration;
      } else if (this.configs.size > 0) {
        this.defaultConfig = this.configs.keys().next().value;
      }

      console.log(`✅ Loaded ${this.configs.size} LLM configurations`);
      console.log(`   Default: ${this.defaultConfig}`);
    } catch (error) {
      console.error('❌ Error loading LLM configurations:', error);
      throw new Error('Failed to load LLM configurations');
    }
  }

  /**
   * Get all available configurations
   */
  getConfigurations(): LLMConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get configuration names
   */
  getConfigurationNames(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get a specific configuration
   */
  getConfiguration(name: string): LLMConfig | null {
    return this.configs.get(name) || null;
  }

  /**
   * Get default configuration name
   */
  getDefaultConfigurationName(): string | null {
    return this.defaultConfig;
  }

  /**
   * Create a LangChain chat model from configuration
   */
  createChatModel(configName: string): BaseChatModel {
    const config = this.getConfiguration(configName);
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
        throw new Error(`Unsupported provider: ${config.provider}`);
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
      modelName: config.model,
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
      const model = this.createChatModel(configName);
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
  reloadConfigurations(): void {
    this.configs.clear();
    this.defaultConfig = null;
    this.loadConfigurations();
  }
}

// Export singleton instance
export const llmConfigService = new LLMConfigService();