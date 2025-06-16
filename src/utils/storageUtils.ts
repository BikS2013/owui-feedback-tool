import { loadRuntimeConfig } from './configLoader';

const DEFAULT_API_URL = 'http://localhost:3001';
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
    // This should only be used during initial render before config is loaded
    return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  },
  
  getDataFolder(): string {
    // Read from environment variable
    return import.meta.env.VITE_GITHUB_DATA_FOLDER || DEFAULT_DATA_FOLDER;
  },
  
  getPromptsFolder(): string {
    // Read from environment variable
    return import.meta.env.VITE_GITHUB_PROMPTS_FOLDER || DEFAULT_PROMPTS_FOLDER;
  },
  
  getDisplayMode(): DisplayMode {
    // Get display mode from localStorage, default to 'engineering'
    const mode = localStorage.getItem('displayMode');
    return (mode === 'magic' || mode === 'engineering') ? mode : 'engineering';
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