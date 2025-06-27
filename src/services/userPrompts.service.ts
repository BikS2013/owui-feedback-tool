import { storageUtils } from '../utils/storageUtils';

export interface UserPrompt {
  id: string;
  name: string;
  description?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPromptResponse {
  prompts: UserPrompt[];
}

export interface SinglePromptResponse {
  prompt: UserPrompt;
}

class UserPromptsService {
  private apiUrlPromise: Promise<string>;

  constructor() {
    this.apiUrlPromise = storageUtils.getApiUrl();
  }

  private async getApiUrl(): Promise<string> {
    return this.apiUrlPromise;
  }
  /**
   * Get list of all user prompts
   */
  async listPrompts(): Promise<UserPrompt[]> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data: UserPromptResponse = await response.json();
      return data.prompts;
    } catch (error) {
      console.error('Failed to list user prompts:', error);
      throw error;
    }
  }

  /**
   * Get a specific user prompt by ID
   */
  async getPrompt(promptId: string): Promise<UserPrompt | null> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${promptId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data: SinglePromptResponse = await response.json();
      return data.prompt;
    } catch (error) {
      console.error(`Failed to get prompt ${promptId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user prompt
   */
  async createPrompt(promptId: string, content: string, extension: string = '.txt'): Promise<UserPrompt> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId,
          content,
          extension
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data: SinglePromptResponse = await response.json();
      return data.prompt;
    } catch (error) {
      console.error('Failed to create prompt:', error);
      throw error;
    }
  }

  /**
   * Update an existing user prompt
   */
  async updatePrompt(promptId: string, content: string): Promise<UserPrompt> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${promptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data: SinglePromptResponse = await response.json();
      return data.prompt;
    } catch (error) {
      console.error(`Failed to update prompt ${promptId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user prompt
   */
  async deletePrompt(promptId: string): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${promptId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to delete prompt ${promptId}:`, error);
      throw error;
    }
  }
}

export const userPromptsService = new UserPromptsService();