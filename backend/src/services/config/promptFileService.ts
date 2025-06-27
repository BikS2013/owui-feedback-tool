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
  defaultAssetPath: string;
  promptKey: string;
}) {
  const assetPath = process.env[config.envVarName] || config.defaultAssetPath;
  const promptService = createPromptFileService(config.promptKey, assetPath);
  
  return {
    getPromptContent: async (): Promise<string> => {
      const service = promptService();
      const content = await service.getConfig('content');
      if (!content) {
        throw new Error(`Prompt content not found for ${config.promptKey}`);
      }
      return content;
    },
    
    preparePrompt: async (replacements: Record<string, string>): Promise<string> => {
      const service = promptService();
      const content = await service.getConfig('content');
      if (!content) {
        throw new Error(`Prompt content not found for ${config.promptKey}`);
      }
      
      let processedContent = content;
      for (const [key, value] of Object.entries(replacements)) {
        processedContent = processedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      return processedContent;
    },
    
    reloadPrompt: async (): Promise<void> => {
      const service = promptService();
      await service.reload();
    }
  };
}

// Re-export the type for compatibility
export interface PromptServiceConfig {
  envVarName: string;
  defaultAssetPath: string;
  promptKey: string;
}