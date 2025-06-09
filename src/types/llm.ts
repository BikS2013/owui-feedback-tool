// LLM Configuration Types

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'azure-openai' | 'litellm' | 'ollama';

export interface LLMConfiguration {
  name: string;
  provider: LLMProvider;
  model: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface LLMConfigurationsResponse {
  configurations: LLMConfiguration[];
  defaultConfiguration: string | null;
}

export interface LLMTestRequest {
  configurationName: string;
  prompt?: string;
}

export interface LLMTestResponse {
  success: boolean;
  configuration: string;
  response?: string;
  error?: string;
  duration?: number;
}