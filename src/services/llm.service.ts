import { Conversation } from '../types/conversation';
import { storageUtils } from '../utils/storageUtils';
import { 
  LLMConfigurationsResponse, 
  LLMTestRequest, 
  LLMTestResponse 
} from '../types/llm';

export interface LLMPromptExecutionRequest {
  llmConfiguration: string;
  promptFilePath: string;
  conversation: Conversation;
}

export interface LLMPromptExecutionResponse {
  success: boolean;
  message: string;
  requestId?: string;
  error?: string;
}

export interface LLMPromptParameterizedExecutionRequest {
  llmConfiguration: string;
  promptText: string;
  parameterValues: Record<string, string>;
}

export interface LLMPromptParameterizedExecutionResponse {
  success: boolean;
  message: string;
  result?: string;
  error?: string;
}

export interface LLMPromptExecutionStatus {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

class LLMService {
  private apiUrlPromise: Promise<string>;

  constructor() {
    this.apiUrlPromise = storageUtils.getApiUrl();
  }

  private async getApiUrl(): Promise<string> {
    return this.apiUrlPromise;
  }

  /**
   * Execute a prompt from GitHub against a conversation using an LLM
   */
  async executePrompt(
    llmConfiguration: string,
    promptFilePath: string,
    conversation: Conversation
  ): Promise<LLMPromptExecutionResponse> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/execute-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          llmConfiguration,
          promptFilePath,
          conversation
        } as LLMPromptExecutionRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing prompt:', error);
      throw error;
    }
  }

  /**
   * Get the status of a prompt execution request
   */
  async getExecutionStatus(requestId: string): Promise<LLMPromptExecutionStatus> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/status/${requestId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting execution status:', error);
      throw error;
    }
  }

  /**
   * Get all available LLM configurations
   */
  async getConfigurations(): Promise<LLMConfigurationsResponse> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/configurations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching LLM configurations:', error);
      throw error;
    }
  }

  /**
   * Test an LLM configuration
   */
  async testConfiguration(configurationName: string, prompt?: string): Promise<LLMTestResponse> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configurationName,
          prompt
        } as LLMTestRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error testing LLM configuration:', error);
      throw error;
    }
  }

  /**
   * Get the selected LLM configuration from localStorage
   */
  getSelectedConfiguration(): string | null {
    return localStorage.getItem('selectedLLMConfiguration');
  }

  /**
   * Set the selected LLM configuration in localStorage
   */
  setSelectedConfiguration(configurationName: string): void {
    localStorage.setItem('selectedLLMConfiguration', configurationName);
  }

  /**
   * Execute a prompt with provided parameter values
   */
  async executePromptWithParameters(
    llmConfiguration: string,
    promptText: string,
    parameterValues: Record<string, string>
  ): Promise<LLMPromptParameterizedExecutionResponse> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/llm/execute-prompt-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          llmConfiguration,
          promptText,
          parameterValues
        } as LLMPromptParameterizedExecutionRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing prompt with parameters:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();