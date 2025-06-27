// LLM Prompt Execution Types

// Conversation type - matches the frontend definition
export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  averageRating: number | null;
  totalRatings: number;
  feedbackEntries: any[];
  modelsUsed?: string[];
  qaPairCount: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
}


// LLM Configuration Types
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'azure-openai' | 'litellm' | 'ollama';

export interface BaseLLMConfig {
  name: string;
  provider: LLMProvider;
  description?: string;
  enabled?: boolean;
}

export interface OpenAIConfig extends BaseLLMConfig {
  provider: 'openai';
  model: string;
  apiKey?: string; // Can be set via env var OPENAI_API_KEY
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
}

export interface AnthropicConfig extends BaseLLMConfig {
  provider: 'anthropic';
  model: string;
  apiKey?: string; // Can be set via env var ANTHROPIC_API_KEY
  temperature?: number;
  maxTokens?: number;
}

export interface GoogleConfig extends BaseLLMConfig {
  provider: 'google';
  model: string;
  apiKey?: string; // Can be set via env var GOOGLE_API_KEY
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AzureOpenAIConfig extends BaseLLMConfig {
  provider: 'azure-openai';
  model: string;
  apiKey?: string;
  apiVersion: string;
  azureOpenAIEndpoint: string;
  azureOpenAIApiDeploymentName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LiteLLMConfig extends BaseLLMConfig {
  provider: 'litellm';
  model: string;
  apiBase: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaConfig extends BaseLLMConfig {
  provider: 'ollama';
  model: string;
  baseUrl?: string; // Default: http://localhost:11434
  temperature?: number;
  numPredict?: number;
}

export type LLMConfig = OpenAIConfig | AnthropicConfig | GoogleConfig | AzureOpenAIConfig | LiteLLMConfig | OllamaConfig;

export interface LLMConfigFile {
  configurations: LLMConfig[];
}

export interface LLMTestRequest {
  configurationName: string;
  prompt?: string; // Optional, defaults to "Hello! Please respond with a brief greeting."
}

export interface LLMTestResponse {
  success: boolean;
  configuration: string;
  response?: string;
  error?: string;
  duration?: number;
}