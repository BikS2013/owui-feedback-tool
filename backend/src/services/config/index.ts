// Import for internal use
import { ensureConfigSchema as _ensureConfigSchema } from './config-clients.js';
import { loadEnvironmentSettings as _loadEnvironmentSettings } from './environmentSettingsService.js';

// Re-export configuration clients
export { githubClient, databaseAssetService, ensureConfigSchema } from './config-clients.js';

// Re-export config factory
export { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

// Re-export environment settings service
export { 
  getEnvironmentSettingsService, 
  loadEnvironmentSettings 
} from './environmentSettingsService.js';

// Re-export client configuration service
export { 
  getClientConfigService, 
  getClientConfiguration 
} from './clientConfigService.js';

// Re-export agent configuration service
export { 
  getAgentConfigService, 
  getAgentConfigurations, 
  getAgentConfiguration, 
  isAgentEnabled 
} from './agentConfigService.js';

// Re-export LLM configuration service
export { 
  getLLMConfigService, 
  getLLMConfigurations, 
  getLLMProvider, 
  getDefaultLLMProvider,
  getExtendedLLMConfigService 
} from './llmConfigService.js';

// Re-export prompt configuration service
export { 
  getPromptConfigService, 
  getPromptTemplates, 
  getPromptTemplate, 
  getPromptTemplatesByCategory 
} from './promptConfigService.js';

// Re-export prompt file service for individual prompt files
export { 
  createPromptFileService, 
  createPromptHelpers, 
  type PromptServiceConfig 
} from './promptFileService.js';

// Main initialization function
export async function initializeConfigurationServices(): Promise<void> {
  console.log('🔧 Initializing configuration services...');
  
  try {
    // Ensure database schema first
    await _ensureConfigSchema();
    
    // Load environment settings first as other configs might depend on them
    await _loadEnvironmentSettings();
    
    console.log('✅ Configuration services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize configuration services:', error);
    throw error;
  }
}

// Refresh all configurations
export async function refreshAllConfigurations(): Promise<void> {
  console.log('🔄 Refreshing all configurations...');
  
  try {
    // Import services locally to avoid circular dependencies
    const { getEnvironmentSettingsService } = await import('./environmentSettingsService.js');
    const { getClientConfigService } = await import('./clientConfigService.js');
    const { getAgentConfigService } = await import('./agentConfigService.js');
    const { getLLMConfigService } = await import('./llmConfigService.js');
    const { getPromptConfigService } = await import('./promptConfigService.js');
    
    const services = [
      getEnvironmentSettingsService(),
      getClientConfigService(),
      getAgentConfigService(),
      getLLMConfigService(),
      getPromptConfigService()
    ];
    
    await Promise.all(services.map(service => service.reload()));
    
    console.log('✅ All configurations refreshed');
  } catch (error) {
    console.error('❌ Failed to refresh configurations:', error);
    throw error;
  }
}