import { storageUtils } from '../utils/storageUtils';

export interface UserPrompt {
  name: string;  // This is now the primary identifier (filename with extension)
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
   * Get a specific user prompt by filename
   */
  async getPrompt(filename: string): Promise<UserPrompt | null> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${encodeURIComponent(filename)}`, {
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
      console.error(`Failed to get prompt ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user prompt
   */
  async createPrompt(filename: string, content: string): Promise<UserPrompt> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
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
      console.error('Failed to create prompt:', error);
      throw error;
    }
  }

  /**
   * Update an existing user prompt
   */
  async updatePrompt(filename: string, content: string): Promise<UserPrompt> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${encodeURIComponent(filename)}`, {
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
      console.error(`Failed to update prompt ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user prompt
   */
  async deletePrompt(filename: string): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/api/user-prompts/${encodeURIComponent(filename)}`, {
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
      console.error(`Failed to delete prompt ${filename}:`, error);
      throw error;
    }
  }
}

export const userPromptsService = new UserPromptsService();