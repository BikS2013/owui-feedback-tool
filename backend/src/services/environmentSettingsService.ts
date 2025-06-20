import { createConfigService } from './config-service-template.js';

interface EnvironmentSettings {
  [key: string]: string;
}

/**
 * Service for loading environment settings from the configuration repository.
 * These settings can override or supplement process.env variables.
 * 
 * The settings file should be a plain text file with KEY=VALUE pairs:
 * ```
 * DATABASE_VERBOSE=false
 * CORS_ORIGINS=http://localhost:5173,http://localhost:5176
 * API_KEY=your-api-key
 * ```
 */
export const getEnvironmentSettingsService = createConfigService<EnvironmentSettings>(
  process.env.ENV_SETTINGS_ASSET_KEY || 'settings/env-settings',
  'env-settings',
  (content) => {
    // Parse KEY=VALUE format
    const settings: EnvironmentSettings = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Find the first = character
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        console.warn(`⚠️  Skipping invalid line (no = found): ${trimmedLine}`);
        continue;
      }
      
      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      if (key) {
        settings[key] = value;
      }
    }
    
    return settings;
  },
  (service, data) => {
    // Process the configuration into the service's map
    for (const [key, value] of Object.entries(data)) {
      service['configs'].set(key, value);
    }
  }
);

/**
 * Loads environment settings from the configuration repository and applies them
 * to process.env. This should be called early in the application startup.
 * 
 * Note: This will NOT override existing environment variables by default.
 * To override existing values, set OVERRIDE_ENV_VARS=true
 */
export async function loadEnvironmentSettings(): Promise<void> {
  try {
    const service = getEnvironmentSettingsService();
    const allSettings = await service.getAll();
    const override = process.env.OVERRIDE_ENV_VARS === 'true';
    
    console.log('🔧 Loading environment settings from configuration repository...');
    
    let loaded = 0;
    let skipped = 0;
    
    // Iterate over the Map entries directly
    for (const [key, value] of allSettings) {
      if (!override && process.env[key] !== undefined) {
        console.log(`   ⏩ Skipping ${key} (already set)`);
        skipped++;
        continue;
      }
      
      // Convert value to string for process.env
      process.env[key] = String(value);
      console.log(`   ✅ Set ${key} = ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
      loaded++;
    }
    
    console.log(`✅ Environment settings loaded: ${loaded} set, ${skipped} skipped`);
  } catch (error) {
    // If settings file doesn't exist or can't be loaded, log but don't fail
    console.log('ℹ️  No environment settings found in configuration repository (this is optional)');
    if (process.env.NODE_ENV === 'development') {
      console.log(`   Debug: ${error}`);
    }
  }
}

/**
 * Gets a specific environment setting value
 * @param key The setting key
 * @param defaultValue Optional default value if setting not found
 * @returns The setting value or default
 */
export async function getEnvironmentSetting(key: string, defaultValue?: any): Promise<any> {
  try {
    const service = getEnvironmentSettingsService();
    const value = await service.getConfig(key);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Reloads environment settings from the configuration repository
 */
export async function reloadEnvironmentSettings(): Promise<void> {
  const service = getEnvironmentSettingsService();
  await service.reload();
  await loadEnvironmentSettings();
}