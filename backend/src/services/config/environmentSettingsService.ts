import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

interface EnvironmentSettings {
  [key: string]: string;
}

export const getEnvironmentSettingsService = createLazyConfigService<EnvironmentSettings>(
  () => {
    const assetKey = process.env.ENVIRONMENT_SETTINGS_ASSET_KEY;
    if (!assetKey) {
      throw new Error('ENVIRONMENT_SETTINGS_ASSET_KEY is required to load environment settings');
    }
    
    return {
      sources: [
        createGitHubSource(assetKey),
        createDatabaseSource('environment-settings', 'configuration')
      ],
      parser: async (content: string) => {
    const settings: EnvironmentSettings = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        settings[key.trim()] = value;
      }
    }
    
    return settings;
      },
      verbose: process.env.CONFIG_VERBOSE === 'true'
    };
  },
  (service, data) => {
    // Process parsed configuration
    service.configs.set('content', data);
    
    // Apply environment variables
    for (const [key, value] of Object.entries(data)) {
      if (!process.env[key]) {
        process.env[key] = value;
        console.log(`✅ Set environment variable: ${key}`);
      }
    }
  }
);

// Load environment settings on startup
export async function loadEnvironmentSettings(): Promise<void> {
  try {
    const service = getEnvironmentSettingsService();
    const settings = await service.getConfig('content');
    
    if (settings) {
      console.log(`✅ Loaded ${Object.keys(settings).length} environment settings`);
    } else {
      console.warn('⚠️  No environment settings found');
    }
  } catch (error) {
    console.error('❌ Failed to load environment settings:', error);
    throw error; // Fail fast if environment settings are missing
  }
}