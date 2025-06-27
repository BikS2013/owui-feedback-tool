import { loadRuntimeConfig } from './configLoader';

const DEFAULT_DATA_FOLDER = 'data';
const DEFAULT_PROMPTS_FOLDER = 'prompts';

export type DisplayMode = 'magic' | 'engineering';

// Custom event for display mode changes
const DISPLAY_MODE_CHANGE_EVENT = 'displayModeChange';

// Cache the runtime config promise to avoid multiple fetches
let configPromise: Promise<string> | null = null;

export const storageUtils = {
  async getApiUrl(): Promise<string> {
    // Use cached promise to avoid multiple config fetches
    if (!configPromise) {
      configPromise = loadRuntimeConfig().then(config => config.apiUrl);
    }
    return configPromise;
  },
  
  // Synchronous fallback for components that can't handle async
  getApiUrlSync(): string {
    // API URL is not part of the configuration anymore
    // Always use the environment variable
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl) {
      console.error('API URL not configured. Please set VITE_API_URL in .env');
      return ''; // Return empty string to avoid breaking the UI
    }
    
    return envUrl;
  },
  
  async getDataFolder(): Promise<string> {
    // GitHub folders are no longer in configuration - use environment variables
    return import.meta.env.VITE_GITHUB_DATA_FOLDER || DEFAULT_DATA_FOLDER;
  },
  
  async getPromptsFolder(): Promise<string> {
    // GitHub folders are no longer in configuration - use environment variables
    return import.meta.env.VITE_GITHUB_PROMPTS_FOLDER || DEFAULT_PROMPTS_FOLDER;
  },
  
  // Synchronous versions for backward compatibility
  getDataFolderSync(): string {
    return import.meta.env.VITE_GITHUB_DATA_FOLDER || DEFAULT_DATA_FOLDER;
  },
  
  getPromptsFolderSync(): string {
    return import.meta.env.VITE_GITHUB_PROMPTS_FOLDER || DEFAULT_PROMPTS_FOLDER;
  },
  
  async getGitHubRepo(): Promise<string> {
    // GitHub repo is no longer in configuration - use environment variable
    const repo = import.meta.env.VITE_GITHUB_REPO;
    if (!repo) {
      throw new Error('GitHub repository not configured. Please set VITE_GITHUB_REPO in .env');
    }
    return repo;
  },
  
  async getGitHubToken(): Promise<string> {
    // GitHub token is no longer in configuration - use environment variable
    return import.meta.env.VITE_GITHUB_TOKEN || '';
  },
  
  async getGitHubApiUrl(): Promise<string> {
    // GitHub API URL is no longer in configuration - use environment variable
    return import.meta.env.VITE_GITHUB_API_URL || 'https://api.github.com';
  },
  
  // Synchronous versions for backward compatibility
  getGitHubRepoSync(): string {
    return import.meta.env.VITE_GITHUB_REPO || 'owner/repository';
  },
  
  getGitHubTokenSync(): string {
    return import.meta.env.VITE_GITHUB_TOKEN || '';
  },
  
  getGitHubApiUrlSync(): string {
    return import.meta.env.VITE_GITHUB_API_URL || 'https://api.github.com';
  },
  
  getDisplayMode(): DisplayMode {
    // Display mode is no longer in configuration - just use localStorage with default
    const mode = localStorage.getItem('displayMode');
    const allowedModes = ['magic', 'engineering'];
    const defaultMode = 'magic';
    
    return (mode && allowedModes.includes(mode as DisplayMode)) ? mode as DisplayMode : defaultMode;
  },
  
  setDisplayMode(mode: DisplayMode): void {
    localStorage.setItem('displayMode', mode);
    // Dispatch custom event to notify components of the change
    window.dispatchEvent(new CustomEvent(DISPLAY_MODE_CHANGE_EVENT, { detail: mode }));
  },
  
  onDisplayModeChange(callback: (mode: DisplayMode) => void): () => void {
    const handler = (event: Event) => {
      callback((event as CustomEvent<DisplayMode>).detail);
    };
    window.addEventListener(DISPLAY_MODE_CHANGE_EVENT, handler);
    // Return cleanup function
    return () => window.removeEventListener(DISPLAY_MODE_CHANGE_EVENT, handler);
  }
};