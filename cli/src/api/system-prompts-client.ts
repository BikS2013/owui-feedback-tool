import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SystemPrompt {
  name: string;
  content: string;
  description?: string;
}

export class SystemPromptsApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3120';
  }

  /**
   * Get a specific system prompt by filename
   */
  async getPrompt(filename: string): Promise<SystemPrompt> {
    try {
      const response = await axios.get<{ prompt: SystemPrompt }>(
        `${this.baseUrl}/api/system-prompts/${filename}`
      );
      return response.data.prompt;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`System prompt '${filename}' not found`);
      }
      throw new Error(`Failed to fetch system prompt: ${error.message}`);
    }
  }

  /**
   * List all available system prompts
   */
  async listPrompts(): Promise<SystemPrompt[]> {
    try {
      const response = await axios.get<{ prompts: SystemPrompt[] }>(
        `${this.baseUrl}/api/system-prompts`
      );
      return response.data.prompts;
    } catch (error: any) {
      throw new Error(`Failed to list system prompts: ${error.message}`);
    }
  }
}