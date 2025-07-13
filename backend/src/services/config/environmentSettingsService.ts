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
    
    // Apply environment variables - always override
    for (const [key, value] of Object.entries(data)) {
      const isOverride = process.env[key] !== undefined;
      process.env[key] = value;
      if (isOverride) {
        console.log(`🔄 Overriding environment variable: ${key}`);
      } else {
        console.log(`✅ Set environment variable: ${key}`);
      }
    }
  }
);

// Load environment settings on startup
export async function loadEnvironmentSettings(): Promise<void> {
  try {
    // Log which GitHub repo is being used for configuration
    const githubRepo = process.env.GITHUB_REPO;
    const assetKey = process.env.ENVIRONMENT_SETTINGS_ASSET_KEY;
    const branch = process.env.GITHUB_BRANCH || 'main';
    
    console.log('🔍 Loading environment settings from GitHub:');
    console.log(`   📦 Repository: ${githubRepo || '(not configured)'}`);
    console.log(`   🌿 Branch: ${branch}`);
    console.log(`   📄 Asset key: ${assetKey || '(not configured)'}`);
    console.log(`   🔗 Full path: ${githubRepo}/${assetKey} (branch: ${branch})`);
    
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