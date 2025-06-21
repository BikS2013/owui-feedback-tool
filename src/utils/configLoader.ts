import { EnvironmentConfigurationService } from '../services/environment-config.service';

interface RuntimeConfig {
  apiUrl: string;
}

let cachedConfig: RuntimeConfig | null = null;
const configService = EnvironmentConfigurationService.getInstance();

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // Return cached config if already loaded
  if (cachedConfig) {
    console.log('[ConfigLoader] Returning cached config:', cachedConfig);
    return cachedConfig;
  }

  console.log('[ConfigLoader] Loading runtime configuration...');
  console.log('[ConfigLoader] Current location:', window.location.href);
  console.log('[ConfigLoader] Build-time VITE_API_URL:', import.meta.env.VITE_API_URL);

  // API URL is now managed separately from configuration
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    throw new Error('API URL not configured. Please set VITE_API_URL in .env');
  }
  
  cachedConfig = {
    apiUrl: apiUrl
  };
  
  // Still initialize the configuration service for feature flags
  try {
    const envConfig = await configService.initialize();
    console.log('[ConfigLoader] Environment configuration loaded:', {
      environment: envConfig.environment,
      source: configService.getConfigSource(),
      features: envConfig.features
    });
  } catch (error) {
    console.error('[ConfigLoader] Failed to load environment configuration:', error);
    // Continue anyway - API URL is already set
  }
  
  return cachedConfig;
}

// Force config reload (useful for testing)
export async function clearConfigCache(): Promise<void> {
  console.log('[ConfigLoader] Clearing config cache');
  cachedConfig = null;
  await configService.reload();
}