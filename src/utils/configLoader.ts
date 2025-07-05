import { EnvironmentConfigurationService } from '../services/environment-config.service';

interface RuntimeConfig {
  apiUrl: string;
}

interface NginxConfig {
  api?: {
    baseUrl?: string;
  };
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

  let apiUrl: string | undefined;

  try {
    // First, try to fetch runtime config from nginx
    console.log('[ConfigLoader] Fetching runtime config from /config.json...');
    const response = await fetch('/config.json');
    
    if (response.ok) {
      const nginxConfig: NginxConfig = await response.json();
      console.log('[ConfigLoader] Nginx config loaded:', nginxConfig);
      
      if (nginxConfig.api?.baseUrl) {
        apiUrl = nginxConfig.api.baseUrl;
        console.log('[ConfigLoader] Using API URL from nginx config:', apiUrl);
      }
    } else {
      console.warn('[ConfigLoader] Failed to fetch /config.json:', response.status, response.statusText);
    }
  } catch (error) {
    console.warn('[ConfigLoader] Error fetching runtime config from nginx:', error);
  }

  // Fall back to build-time config if nginx config not available
  if (!apiUrl) {
    apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      console.log('[ConfigLoader] Falling back to build-time VITE_API_URL:', apiUrl);
    }
  }
  
  if (!apiUrl) {
    throw new Error('API URL not configured. Please ensure /config.json is served by nginx or set VITE_API_URL in .env');
  }
  
  cachedConfig = {
    apiUrl: apiUrl
  };
  
  // Initialize the configuration service with the resolved API URL
  configService.setApiUrl(apiUrl);
  
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