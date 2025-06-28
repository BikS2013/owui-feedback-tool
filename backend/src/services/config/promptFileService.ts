import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

// Service for loading individual prompt files
export function createPromptFileService(promptKey: string, assetPath: string) {
  return createLazyConfigService<string>(
    () => ({
      sources: [
        createGitHubSource(assetPath),
        createDatabaseSource(`prompt:${promptKey}`, 'prompts')
      ],
      parser: async (content: string) => content, // Return raw content
      verbose: process.env.CONFIG_VERBOSE === 'true'
    }),
    (service, data) => {
      service.configs.set('content', data);
    }
  );
}

// Helper to create prompt services
export function createPromptHelpers(config: {
  envVarName: string;
  promptKey: string;
}) {
  // Lazy initialization - defer environment variable check until first use
  let promptService: ReturnType<typeof createPromptFileService> | null = null;
  
  const getPromptService = () => {
    if (!promptService) {
      const assetPath = process.env[config.envVarName];
      if (!assetPath) {
        throw new Error(`Environment variable ${config.envVarName} is required for prompt ${config.promptKey}. No default asset path is allowed per configuration policy.`);
      }
      promptService = createPromptFileService(config.promptKey, assetPath);
    }
    return promptService;
  };
  
  return {
    getPromptContent: async (): Promise<string> => {
      const service = getPromptService()();
      const content = await service.getConfig('content');
      if (!content) {
        throw new Error(`Prompt content not found for ${config.promptKey}`);
      }
      return content;
    },
    
    preparePrompt: async (replacements: Record<string, string>): Promise<string> => {
      const service = getPromptService()();
      const content = await service.getConfig('content');
      if (!content) {
        throw new Error(`Prompt content not found for ${config.promptKey}`);
      }
      
      let processedContent = content;
      for (const [key, value] of Object.entries(replacements)) {
        // First try to replace double curly braces {{key}}
        processedContent = processedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        // Then try to replace single curly braces {key}
        processedContent = processedContent.replace(new RegExp(`{${key}}`, 'g'), value);
      }
      
      return processedContent;
    },
    
    reloadPrompt: async (): Promise<void> => {
      const service = getPromptService()();
      await service.reload();
    }
  };
}

// Re-export the type for compatibility
export interface PromptServiceConfig {
  envVarName: string;
  promptKey: string;
}