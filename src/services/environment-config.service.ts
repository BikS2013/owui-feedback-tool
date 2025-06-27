import { EnvironmentConfiguration, FeatureConfiguration } from '../types/environment-config';

export class EnvironmentConfigurationService {
  private static instance: EnvironmentConfigurationService;
  private config: EnvironmentConfiguration | null = null;
  private fetchPromise: Promise<EnvironmentConfiguration> | null = null;
  private detectedEnvironment: string | null = null;
  private configSource: 'runtime' | 'buildtime' | null = null;

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
    this.configSource = null;
    console.log('[EnvironmentConfig] Configuration cache cleared for reload');
  }

  private async loadConfiguration(): Promise<EnvironmentConfiguration> {
    console.log('[EnvironmentConfig] Loading configuration...');
    
    // Step 1: Detect environment
    this.detectedEnvironment = this.detectEnvironment();
    console.log(`[EnvironmentConfig] Detected environment: ${this.detectedEnvironment}`);
    
    // Step 2: Try to fetch configuration from API
    const apiConfig = await this.fetchConfigurationFromAPI();
    if (apiConfig) {
      this.configSource = 'runtime';
      console.log('[EnvironmentConfig] Loaded runtime configuration from API');
      return apiConfig;
    }
    
    // If no API config, throw error as we expect configuration to be available
    throw new Error('No configuration available from API');
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const config = await response.json();
      console.log('[EnvironmentConfig] Received configuration from API:', config);
      return config;
    } catch (error) {
      console.error('[EnvironmentConfig] Error fetching configuration from API:', error);
      throw error;
    }
  }
  
  // @ts-ignore - Keeping for potential future use
  private getBuildTimeConfiguration(): EnvironmentConfiguration | null {
    // Return build-time configuration if any feature flags are set
    const hasFeatureFlags = 
      import.meta.env.VITE_SHOW_DOCUMENTS !== undefined ||
      import.meta.env.VITE_SHOW_RUNS !== undefined ||
      import.meta.env.VITE_SHOW_CHECKPOINTS !== undefined;
    
    if (!hasFeatureFlags) {
      return null;
    }
    
    if (!this.detectedEnvironment) {
      throw new Error('Environment detection failed');
    }
    
    if (!import.meta.env.VITE_APP_VERSION) {
      throw new Error('VITE_APP_VERSION not configured');
    }
    
    return {
      environment: this.detectedEnvironment as 'development' | 'staging' | 'production',
      version: import.meta.env.VITE_APP_VERSION,
      timestamp: new Date().toISOString(),
      features: {
        show_documents: import.meta.env.VITE_SHOW_DOCUMENTS === 'true',
        show_runs: import.meta.env.VITE_SHOW_RUNS === 'true',
        show_checkpoints: import.meta.env.VITE_SHOW_CHECKPOINTS === 'true'
      }
    };
  }
  
  getConfig(): EnvironmentConfiguration {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }
  
  getConfigSource(): 'runtime' | 'buildtime' {
    if (!this.configSource) {
      throw new Error('Configuration not properly loaded');
    }
    return this.configSource;
  }
  
  // Simplified getters
  getEnvironment(): string {
    if (!this.config?.environment) {
      throw new Error('Environment not available in configuration');
    }
    return this.config.environment;
  }
  
  getVersion(): string {
    if (!this.config?.version) {
      throw new Error('Version not available in configuration');
    }
    return this.config.version;
  }
  
  
  getFeature(feature: keyof FeatureConfiguration): boolean {
    if (!this.config?.features || this.config.features[feature] === undefined) {
      throw new Error(`Feature '${feature}' not available in configuration`);
    }
    return this.config.features[feature];
  }
  
  getTabVisibility(): { showDocuments: boolean; showRuns: boolean; showCheckpoints: boolean } {
    if (!this.config?.features) {
      throw new Error('Features configuration not available');
    }
    
    if (this.config.features.show_documents === undefined || 
        this.config.features.show_runs === undefined || 
        this.config.features.show_checkpoints === undefined) {
      throw new Error('Tab visibility configuration is incomplete');
    }
    
    return {
      showDocuments: this.config.features.show_documents,
      showRuns: this.config.features.show_runs,
      showCheckpoints: this.config.features.show_checkpoints
    };
  }
}

// Create a singleton instance
export const environmentConfig = EnvironmentConfigurationService.getInstance();