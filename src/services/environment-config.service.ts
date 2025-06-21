import { EnvironmentConfiguration, FeatureConfiguration } from '../types/environment-config';

// Default configurations for each environment
const ENVIRONMENT_DEFAULTS: Record<string, EnvironmentConfiguration> = {
  development: {
    environment: 'development',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      show_documents: true,
      show_runs: true,
      show_checkpoints: true
    }
  },
  
  staging: {
    environment: 'staging',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      show_documents: true,
      show_runs: true,
      show_checkpoints: true
    }
  },
  
  production: {
    environment: 'production',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      show_documents: true,
      show_runs: true,
      show_checkpoints: true
    }
  }
};

export class EnvironmentConfigurationService {
  private static instance: EnvironmentConfigurationService;
  private config: EnvironmentConfiguration | null = null;
  private fetchPromise: Promise<EnvironmentConfiguration> | null = null;
  private detectedEnvironment: string | null = null;
  private configSource: 'runtime' | 'buildtime' | 'default' = 'default';

  private constructor() {}

  static getInstance(): EnvironmentConfigurationService {
    if (!EnvironmentConfigurationService.instance) {
      EnvironmentConfigurationService.instance = new EnvironmentConfigurationService();
    }
    return EnvironmentConfigurationService.instance;
  }

  async initialize(): Promise<EnvironmentConfiguration> {
    // Prevent multiple simultaneous fetches
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.loadConfiguration();
    
    try {
      this.config = await this.fetchPromise;
      return this.config;
    } catch (error) {
      // Reset on error to allow retry
      this.fetchPromise = null;
      throw error;
    }
  }

  async reload(): Promise<void> {
    // Clear cached configuration to force reload
    this.config = null;
    this.fetchPromise = null;
    this.detectedEnvironment = null;
    this.configSource = 'default';
    console.log('[EnvironmentConfig] Configuration cache cleared for reload');
  }

  private async loadConfiguration(): Promise<EnvironmentConfiguration> {
    console.log('[EnvironmentConfig] Loading configuration...');
    
    // Step 1: Detect environment
    this.detectedEnvironment = this.detectEnvironment();
    console.log(`[EnvironmentConfig] Detected environment: ${this.detectedEnvironment}`);
    
    // Step 2: Try to fetch configuration from API
    try {
      const apiConfig = await this.fetchConfigurationFromAPI();
      if (apiConfig) {
        this.configSource = 'runtime';
        console.log('[EnvironmentConfig] Loaded runtime configuration from API');
        return apiConfig;
      }
    } catch (error) {
      console.warn('[EnvironmentConfig] Failed to fetch runtime configuration:', error);
    }
    
    // Step 3: Fallback to build-time configuration
    const buildTimeConfig = this.getBuildTimeConfiguration();
    if (buildTimeConfig) {
      this.configSource = 'buildtime';
      console.log('[EnvironmentConfig] Using build-time configuration');
      return buildTimeConfig;
    }
    
    // Step 4: Use environment defaults
    this.configSource = 'default';
    console.log('[EnvironmentConfig] Using default configuration');
    return ENVIRONMENT_DEFAULTS[this.detectedEnvironment];
  }
  
  private detectEnvironment(): string {
    // Check various indicators to determine environment
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Development indicators
    if (hostname === 'localhost' || hostname === '127.0.0.1' || port === '5173') {
      return 'development';
    }
    
    // Staging indicators
    if (hostname.includes('staging') || hostname.includes('test') || hostname.includes('dev')) {
      return 'staging';
    }
    
    // Default to production
    return 'production';
  }
  
  private async fetchConfigurationFromAPI(): Promise<EnvironmentConfiguration | null> {
    try {
      // Get API URL directly from environment variable to avoid circular dependency
      const apiBaseUrl = import.meta.env.VITE_API_URL;
      
      if (!apiBaseUrl) {
        console.warn('[EnvironmentConfig] No API base URL available');
        return null;
      }
      
      console.log(`[EnvironmentConfig] Fetching configuration from: ${apiBaseUrl}/configuration`);
      const response = await fetch(`${apiBaseUrl}/configuration`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const config = await response.json();
      console.log('[EnvironmentConfig] Received configuration from API:', config);
      return config;
    } catch (error) {
      console.error('[EnvironmentConfig] Error fetching configuration from API:', error);
      return null;
    }
  }
  
  private getBuildTimeConfiguration(): EnvironmentConfiguration | null {
    // Return build-time configuration if any feature flags are set
    const hasFeatureFlags = 
      import.meta.env.VITE_SHOW_DOCUMENTS !== undefined ||
      import.meta.env.VITE_SHOW_RUNS !== undefined ||
      import.meta.env.VITE_SHOW_CHECKPOINTS !== undefined;
    
    if (!hasFeatureFlags) {
      return null;
    }
    
    return {
      environment: (this.detectedEnvironment || 'development') as 'development' | 'staging' | 'production',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        show_documents: import.meta.env.VITE_SHOW_DOCUMENTS !== 'false',
        show_runs: import.meta.env.VITE_SHOW_RUNS !== 'false',
        show_checkpoints: import.meta.env.VITE_SHOW_CHECKPOINTS !== 'false'
      }
    };
  }
  
  getConfig(): EnvironmentConfiguration {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }
  
  getConfigSource(): 'runtime' | 'buildtime' | 'default' {
    return this.configSource;
  }
  
  // Simplified getters
  getEnvironment(): string {
    return this.config?.environment || 'development';
  }
  
  getVersion(): string {
    return this.config?.version || '1.0.0';
  }
  
  
  getFeature(feature: keyof FeatureConfiguration): boolean {
    return this.config?.features?.[feature] ?? true;
  }
  
  getTabVisibility(): { showDocuments: boolean; showRuns: boolean; showCheckpoints: boolean } {
    return {
      showDocuments: this.config?.features?.show_documents ?? true,
      showRuns: this.config?.features?.show_runs ?? true,
      showCheckpoints: this.config?.features?.show_checkpoints ?? true
    };
  }
}

// Create a singleton instance
export const environmentConfig = EnvironmentConfigurationService.getInstance();