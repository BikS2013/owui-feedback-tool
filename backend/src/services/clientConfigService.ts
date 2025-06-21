/**
 * Client Configuration Service
 * 
 * Manages the loading and caching of client configuration from GitHub repository
 * following the configuration-service-pattern.
 */

import { GitHubAssetService } from './githubAssetService.js';

// Configuration interface matching the simplified frontend config
export interface ClientConfiguration {
  environment: 'development' | 'staging' | 'production';
  version: string;
  timestamp: string;
  features: {
    show_documents: boolean;
    show_runs: boolean;
    show_checkpoints: boolean;
  };
}

export class ClientConfigService {
  private assetService: GitHubAssetService;
  private config: ClientConfiguration | null = null;
  private initialized = false;

  constructor() {
    this.assetService = new GitHubAssetService();
  }

  /**
   * Initialize the service and load configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const assetKey = process.env.CLIENT_SETTINGS;
    
    if (!assetKey) {
      throw new Error('CLIENT_SETTINGS environment variable is not configured');
    }

    try {
      // Load from asset service (GitHub)
      const content = await this.assetService.getAsset(assetKey, 'configuration');
      
      this.config = JSON.parse(content);
      console.log('✅ Loaded client configuration from GitHub asset:', assetKey);
    } catch (error) {
      throw new Error(`Failed to load client configuration from GitHub: ${error}`);
    }

    this.initialized = true;
  }


  /**
   * Get the current configuration
   */
  getConfiguration(): ClientConfiguration {
    if (!this.initialized || !this.config) {
      throw new Error('Client configuration service not initialized');
    }
    return this.config;
  }

  /**
   * Reload configuration from source
   */
  async reload(): Promise<void> {
    this.initialized = false;
    this.config = null;
    await this.initialize();
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
let clientConfigService: ClientConfigService | null = null;

export function getClientConfigService(): ClientConfigService {
  if (!clientConfigService) {
    clientConfigService = new ClientConfigService();
  }
  return clientConfigService;
}