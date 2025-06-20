import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getGitHubAssetService } from './githubAssetService.js';

export class ConfigService<T> {
  protected configs: Map<string, any> = new Map();
  private rawCache: string | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private readonly assetKey: string;
  private readonly localPath: string;
  private readonly parser: (content: string) => T | Promise<T>;

  constructor(
    assetKey: string,
    localFileName: string,
    parser: (content: string) => T | Promise<T>
  ) {
    this.assetKey = assetKey;
    this.localPath = localFileName ? join(process.cwd(), localFileName) : '';
    this.parser = parser;
  }

  private async loadConfiguration(): Promise<void> {
    let content: string | null = null;

    // Check in-memory cache first
    if (this.rawCache) {
      console.log('📦 Using cached configuration content');
      content = this.rawCache;
    } else {
      // Try GitHub asset service
      const assetService = getGitHubAssetService();
      if (this.assetKey && assetService.isServiceConfigured()) {
        try {
          console.log(`🔄 Loading configuration from GitHub asset: ${this.assetKey}`);
          content = await assetService.getAsset(this.assetKey, 'config');
          this.rawCache = content; // Cache for future use
          console.log(`✅ Configuration loaded from GitHub asset service`);
        } catch (error) {
          console.error(`⚠️  Failed to load from GitHub: ${error}`);
          // Fall back to local file
        }
      }

      // Fall back to local file if needed (only if localPath is provided)
      if (!content && this.localPath && existsSync(this.localPath)) {
        console.log(`📄 Loading configuration from local file: ${this.localPath}`);
        content = readFileSync(this.localPath, 'utf8');
        this.rawCache = content;
        console.log(`✅ Configuration loaded from local file`);
      }
    }

    if (!content) {
      const errorMsg = this.localPath 
        ? `Configuration not found: ${this.assetKey} or ${this.localPath}`
        : `Configuration not found in GitHub asset repository: ${this.assetKey}`;
      throw new Error(errorMsg);
    }

    // Parse and store configuration
    const parsed = await this.parser(content);
    this.processConfiguration(parsed);
  }

  protected processConfiguration(data: T): void {
    // Override in subclass to handle specific configuration structure
    throw new Error('processConfiguration must be implemented');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      await this.loadConfiguration();
      this.initialized = true;
    })();
    
    await this.initPromise;
  }

  async getConfig(key?: string): Promise<any> {
    await this.ensureInitialized();
    return key ? this.configs.get(key) : Array.from(this.configs.values());
  }

  async getAll(): Promise<Map<string, any>> {
    await this.ensureInitialized();
    return new Map(this.configs);
  }

  async reload(): Promise<void> {
    this.configs.clear();
    this.rawCache = null;
    this.initialized = false;
    this.initPromise = null;
    await this.ensureInitialized();
  }
}

// Singleton factory helper
export function createConfigService<T>(
  assetKey: string,
  localFileName: string,
  parser: (content: string) => T | Promise<T>,
  processor: (service: ConfigService<T>, data: T) => void
): () => ConfigService<T> {
  let instance: ConfigService<T> | null = null;

  return () => {
    if (!instance) {
      class SpecificConfigService extends ConfigService<T> {
        protected processConfiguration(data: T): void {
          processor(this, data);
        }
      }
      instance = new SpecificConfigService(assetKey, localFileName, parser);
    }
    return instance;
  };
}