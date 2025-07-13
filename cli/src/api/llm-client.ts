import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';

export interface LLMConfiguration {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure-openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  systemPrompt?: string;
  // Azure-specific fields (matching backend)
  endpoint?: string;
  azureOpenAIEndpoint?: string;
  apiVersion?: string;
  azureOpenAIApiDeploymentName?: string;
  [key: string]: any;
}

export interface LLMConfigurationsResponse {
  configurations: LLMConfiguration[];
}

export class LLMApiClient {
  private client: AxiosInstance;
  
  constructor() {
    const baseURL = process.env.API_BASE_URL;
    if (!baseURL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async getConfigurations(): Promise<LLMConfiguration[]> {
    try {
      const response = await this.client.get('/api/llm/configurations');
      return response.data.configurations || response.data;
    } catch (error) {
      logger.error('Failed to fetch LLM configurations', error);
      throw new Error(`Failed to fetch LLM configurations: ${error}`);
    }
  }
  
  async getConfigurationByName(name: string): Promise<LLMConfiguration | null> {
    try {
      const configurations = await this.getConfigurations();
      const config = configurations.find(c => c.name === name);
      
      if (!config) {
        logger.error(`LLM configuration '${name}' not found`);
        return null;
      }
      
      return config;
    } catch (error) {
      logger.error(`Failed to get LLM configuration '${name}'`, error);
      throw error;
    }
  }
}