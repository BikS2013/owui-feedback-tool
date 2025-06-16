interface RuntimeConfig {
  apiUrl: string;
}

let cachedConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // Return cached config if already loaded
  if (cachedConfig) {
    console.log('[ConfigLoader] Returning cached config:', cachedConfig);
    return cachedConfig;
  }

  console.log('[ConfigLoader] Loading runtime configuration...');
  console.log('[ConfigLoader] Current location:', window.location.href);
  console.log('[ConfigLoader] Build-time VITE_API_URL:', import.meta.env.VITE_API_URL);

  try {
    // Try to load runtime config from nginx endpoint
    // Use absolute path to ensure it works regardless of base URL
    const configUrl = `${window.location.origin}/config.json`;
    console.log('[ConfigLoader] Fetching config from:', configUrl);
    
    const response = await fetch(configUrl);
    console.log('[ConfigLoader] Response status:', response.status);
    console.log('[ConfigLoader] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const text = await response.text();
      console.log('[ConfigLoader] Raw response:', text);
      
      try {
        const config = JSON.parse(text);
        console.log('[ConfigLoader] Parsed config:', config);
        
        if (config.apiUrl) {
          console.log('[ConfigLoader] Using runtime config with apiUrl:', config.apiUrl);
          cachedConfig = config;
          return config;
        } else {
          console.warn('[ConfigLoader] Config loaded but missing apiUrl field');
        }
      } catch (parseError) {
        console.error('[ConfigLoader] Failed to parse config JSON:', parseError);
      }
    } else {
      console.warn('[ConfigLoader] Config endpoint returned non-OK status:', response.status);
    }
  } catch (error) {
    console.error('[ConfigLoader] Failed to fetch runtime config:', error);
  }

  // Fallback to build-time environment variables
  const fallbackApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  console.log('[ConfigLoader] Falling back to build-time config with apiUrl:', fallbackApiUrl);
  
  cachedConfig = {
    apiUrl: fallbackApiUrl
  };
  
  return cachedConfig;
}

// Force config reload (useful for testing)
export function clearConfigCache(): void {
  console.log('[ConfigLoader] Clearing config cache');
  cachedConfig = null;
}