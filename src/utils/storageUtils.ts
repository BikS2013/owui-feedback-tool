const DEFAULT_API_URL = 'http://localhost:3001';
const DEFAULT_DATA_FOLDER = 'data';
const DEFAULT_PROMPTS_FOLDER = 'prompts';

export const storageUtils = {
  getApiUrl(): string {
    // Always read from environment variable, never from localStorage
    return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  },
  
  getDataFolder(): string {
    // Read from environment variable
    return import.meta.env.VITE_GITHUB_DATA_FOLDER || DEFAULT_DATA_FOLDER;
  },
  
  getPromptsFolder(): string {
    // Read from environment variable
    return import.meta.env.VITE_GITHUB_PROMPTS_FOLDER || DEFAULT_PROMPTS_FOLDER;
  }
};