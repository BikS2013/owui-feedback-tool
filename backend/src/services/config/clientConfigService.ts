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
  () => {
    const assetKey = process.env.CLIENT_SETTINGS || process.env.CLIENT_CONFIG_ASSET_KEY || 'config/client-config.json';
    console.log(`   🔧 Client config service initializing...`);
    console.log(`      • Asset key: ${assetKey}`);
    console.log(`      • Sources: GitHub (priority 1), Database (priority 2)`);
    
    return {
      sources: [
        createGitHubSource(assetKey),
        createDatabaseSource('client-config', 'configuration')
      ],
      parser: async (content: string) => {
        console.log(`      📄 Parsing configuration content (${content.length} bytes)`);
        return JSON.parse(content) as ClientConfig;
      },
      verbose: true, // Always verbose for configuration
      onSourceAttempt: (source: any, index: number) => {
        console.log(`      🔍 Attempting source ${index + 1}: ${source.type} (priority ${source.priority})`);
      },
      onSourceSuccess: (source: any, index: number) => {
        console.log(`      ✅ Successfully loaded from: ${source.type} (source ${index + 1})`);
      },
      onSourceError: (source: any, index: number, error: any) => {
        console.log(`      ⚠️  Failed to load from ${source.type}: ${error.message}`);
      }
    };
  },
  (service, data) => {
    console.log(`      💾 Storing configuration in service cache`);
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