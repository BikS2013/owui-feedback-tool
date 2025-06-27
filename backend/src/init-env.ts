import dotenv from 'dotenv';

// Load .env file first
dotenv.config();

// Then load environment settings from configuration
async function initializeEnvironment() {
  try {
    // Check if we have the minimum required config to load settings
    const hasGitHubConfig = process.env.GITHUB_REPO && process.env.GITHUB_TOKEN;
    const hasSettingsKey = process.env.ENVIRONMENT_SETTINGS_ASSET_KEY;
    
    if (!hasGitHubConfig || !hasSettingsKey) {
      console.log('⚠️  Skipping environment settings load - missing required configuration');
      console.log('   Required: GITHUB_REPO, GITHUB_TOKEN, ENVIRONMENT_SETTINGS_ASSET_KEY');
      return;
    }
    
    // Only import what we need for environment loading
    const { loadEnvironmentSettings } = await import('./services/config/environmentSettingsService.js');
    
    console.log('🔄 Loading environment settings from configuration...');
    console.log(`   Asset key: ${process.env.ENVIRONMENT_SETTINGS_ASSET_KEY}`);
    
    await loadEnvironmentSettings();
    console.log('✅ Environment initialization complete');
    
    // Log which env vars were loaded from settings
    const settingsLoaded = Object.keys(process.env).filter(key => 
      !Object.prototype.hasOwnProperty.call(process.env, key)
    );
    if (settingsLoaded.length > 0) {
      console.log('   Loaded variables:', settingsLoaded.join(', '));
    }
  } catch (error) {
    console.error('❌ Failed to initialize environment:', error);
    // Don't throw - allow app to continue with .env settings only
    console.warn('⚠️  Continuing with .env settings only');
  }
}

// Export the initialization promise so it can be awaited
export const envInitialized = initializeEnvironment();