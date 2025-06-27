import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

interface ClientConfig {
  environment: string;
  version: string;
  features: {
    analytics: {
      enabled: boolean;
      providers: string[];
      debugMode: boolean;
    };
    darkMode: {
      enabled: boolean;
      default: string;
    };
    betaFeatures: {
      enabled: boolean;
      allowedUsers: string[];
    };
    debugging: {
      enabled: boolean;
      logLevel: string;
      consoleOutput: boolean;
    };
  };
  ui: {
    displayMode: {
      default: string;
      allowedModes: string[];
    };
  };
  api: {
    baseUrl: string;
    endpoints: Record<string, string>;
  };
  github: {
    repo: string;
    dataFolder: string;
    promptsFolder: string;
  };
}

export const getClientConfigService = createLazyConfigService<ClientConfig>(
  () => ({
    sources: [
      createGitHubSource(process.env.CLIENT_SETTINGS || process.env.CLIENT_CONFIG_ASSET_KEY || 'config/client-config.json'),
      createDatabaseSource('client-config', 'configuration')
    ],
    parser: async (content: string) => JSON.parse(content) as ClientConfig,
    verbose: process.env.CONFIG_VERBOSE === 'true'
  }),
  (service, data) => {
    service.configs.set('content', data);
  }
);

// Get client configuration for API responses
export async function getClientConfiguration(): Promise<ClientConfig | null> {
  try {
    const service = getClientConfigService();
    return await service.getConfig('content');
  } catch (error) {
    console.error('❌ Failed to get client configuration:', error);
    throw error; // No fallback for missing client config
  }
}