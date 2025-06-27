import { createConfigService, ConfigServiceOptions } from '@biks2013/config-service';
import { githubClient, databaseAssetService } from './config-clients.js';

// Factory function that creates config services with lazy initialization
export function createLazyConfigService<T>(
  getOptions: () => ConfigServiceOptions<T>,
  processor: (service: any, data: T) => void
) {
  let serviceFactory: (() => any) | null = null;
  
  return () => {
    if (!serviceFactory) {
      // Create the service factory only when first accessed
      serviceFactory = createConfigService<T>(getOptions(), processor);
    }
    return serviceFactory();
  };
}

// Helper to create GitHub source
export function createGitHubSource(assetKey: string) {
  return {
    type: 'github' as const,
    priority: 1,
    options: {
      get client() { return githubClient(); },
      assetKey
    }
  };
}

// Helper to create database source
export function createDatabaseSource(assetKey: string, category: string) {
  return {
    type: 'database' as const,
    priority: 2,
    options: {
      get service() { return databaseAssetService(); },
      assetKey,
      category
    }
  };
}