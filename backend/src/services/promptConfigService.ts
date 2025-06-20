import { ConfigService } from './config-service-template.js';

/**
 * Generic prompt configuration service that can handle any prompt file
 * based on environment variables and the config-service-template pattern
 * This service ONLY loads from the configuration repository - no local fallback
 */
class PromptConfigService extends ConfigService<string> {
  private promptKey: string;

  constructor(
    envVarName: string,
    defaultAssetPath: string,
    promptKey: string
  ) {
    const assetPath = process.env[envVarName] || defaultAssetPath;
    
    super(
      assetPath,
      '', // No local file fallback - empty string disables it
      // Parser - for text files, just return the content as-is
      (content: string) => content
    );
    
    this.promptKey = promptKey;
  }

  protected processConfiguration(data: string): void {
    // For prompt files, we store the entire content under the prompt key
    this.configs.set(this.promptKey, data);
  }

  async getPromptContent(): Promise<string> {
    const content = await this.getConfig(this.promptKey);
    if (!content) {
      throw new Error(`Prompt content not found for key: ${this.promptKey}`);
    }
    return content as string;
  }

  /**
   * Replace placeholders in the prompt template
   * @param replacements Object containing key-value pairs for replacement
   * @returns The prompt with placeholders replaced
   */
  async preparePrompt(replacements: Record<string, string>): Promise<string> {
    const template = await this.getPromptContent();
    let result = template;
    
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }
}

// Factory function to create prompt services
export function createPromptService(
  envVarName: string,
  defaultAssetPath: string,
  promptKey: string
): () => PromptConfigService {
  let instance: PromptConfigService | null = null;
  
  return () => {
    if (!instance) {
      instance = new PromptConfigService(
        envVarName,
        defaultAssetPath,
        promptKey
      );
    }
    return instance;
  };
}

// Helper type for prompt service configuration
export interface PromptServiceConfig {
  envVarName: string;
  defaultAssetPath: string;
  promptKey: string;
}

// Generic helper functions
export function createPromptHelpers(config: PromptServiceConfig) {
  const getService = createPromptService(
    config.envVarName,
    config.defaultAssetPath,
    config.promptKey
  );

  return {
    async getPromptContent(): Promise<string> {
      const service = getService();
      return await service.getPromptContent();
    },

    async preparePrompt(replacements: Record<string, string>): Promise<string> {
      const service = getService();
      return await service.preparePrompt(replacements);
    },

    async reloadPrompt(): Promise<void> {
      const service = getService();
      await service.reload();
    }
  };
}