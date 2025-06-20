import axios from 'axios';
import { getAssetDatabaseService } from './assetDatabaseService.js';

interface AssetResponse {
  content: string;
  sha: string;
  size: number;
  encoding: string;
  lastModified: string;
  source?: 'github' | 'database';
  databaseVersion?: string;
}

interface GitHubFileResponse {
  content: string;
  encoding: string;
  sha: string;
  size: number;
  type: string;
  name: string;
  path: string;
}

interface GitHubDirectoryItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export class GitHubAssetService {
  private readonly baseUrl = 'https://api.github.com';
  private readonly repo: string;
  private readonly token: string;
  private readonly branch: string;
  private cache: Map<string, { content: string; timestamp: number }> = new Map();
  private readonly cacheTTL: number;
  private readonly cacheEnabled: boolean;
  private readonly isConfigured: boolean;

  constructor() {
    this.repo = process.env.GITHUB_CONFIG_REPO || '';
    this.token = process.env.GITHUB_CONFIG_TOKEN || '';
    this.branch = process.env.GITHUB_CONFIG_BRANCH || 'main';
    this.isConfigured = !!(this.repo && this.token);
    
    // Cache configuration
    this.cacheEnabled = process.env.ASSET_MEMORY_CACHE_ENABLED !== 'false';
    const ttlSeconds = parseInt(process.env.ASSET_MEMORY_CACHE_TTL || '300', 10);
    this.cacheTTL = ttlSeconds * 1000; // Convert to milliseconds
    
    // Report configuration status on initialization
    if (this.isConfigured) {
      console.log('🔧 GitHub Asset Service: ✅ Configured');
      console.log(`   Repository: ${this.repo}`);
      console.log(`   Branch: ${this.branch}`);
      console.log(`   Token: ***${this.token.slice(-4)}`);
      console.log(`   Memory Cache: ${this.cacheEnabled ? `✅ Enabled (TTL: ${ttlSeconds}s)` : '❌ Disabled'}`);
    } else {
      console.log('🔧 GitHub Asset Service: ❌ Not configured');
      if (!this.repo) console.log('   Missing: GITHUB_CONFIG_REPO');
      if (!this.token) console.log('   Missing: GITHUB_CONFIG_TOKEN');
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error('GitHub configuration repository settings are missing. Please set GITHUB_CONFIG_REPO and GITHUB_CONFIG_TOKEN environment variables.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
    };
  }

  private getCacheKey(key: string): string {
    return `${this.repo}:${this.branch}:${key}`;
  }

  private getFromCache(key: string): string | null {
    if (!this.cacheEnabled) {
      return null;
    }
    
    const cacheKey = this.getCacheKey(key);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }
    
    this.cache.delete(cacheKey);
    return null;
  }

  private setCache(key: string, content: string): void {
    if (!this.cacheEnabled) {
      return;
    }
    
    const cacheKey = this.getCacheKey(key);
    this.cache.set(cacheKey, {
      content,
      timestamp: Date.now(),
    });
  }

  async getAsset(key: string, assetCategory?: string): Promise<string> {
    this.ensureConfigured();
    
    // Check in-memory cache first
    const cached = this.getFromCache(key);
    if (cached !== null) {
      console.log(`[GitHub Service] Serving from in-memory cache: ${key}`);
      return cached;
    }

    // Use database service with fallback
    const dbService = getAssetDatabaseService();
    
    if (dbService.isConfigured()) {
      const result = await dbService.getAssetWithFallback(
        key,
        assetCategory || 'general',
        async () => {
          console.log(`[GitHub Service] Fetching from GitHub: ${key}`);
          // Fetch from GitHub
          const url = `${this.baseUrl}/repos/${this.repo}/contents/${key}`;
          const response = await axios.get<GitHubFileResponse>(url, {
            headers: this.getHeaders(),
            params: {
              ref: this.branch,
            },
          });

          if (response.data.type !== 'file') {
            throw new Error(`Path ${key} is not a file`);
          }

          // Decode base64 content
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          console.log(`[GitHub Service] Content fetched from GitHub (length: ${content.length})`);
          
          // Cache the result in memory
          this.setCache(key, content);
          
          return content;
        }
      );
      
      console.log(`[GitHub Service] Asset served from: ${result.source}`);
      
      // If content came from database, still cache it in memory
      if (result.source === 'database') {
        this.setCache(key, result.content);
        console.log(`[GitHub Service] Database content (length: ${result.content.length})`);
      }
      
      return result.content;
    } else {
      // If database not configured, use original GitHub-only logic
      try {
        const url = `${this.baseUrl}/repos/${this.repo}/contents/${key}`;
        const response = await axios.get<GitHubFileResponse>(url, {
          headers: this.getHeaders(),
          params: {
            ref: this.branch,
          },
        });

        if (response.data.type !== 'file') {
          throw new Error(`Path ${key} is not a file`);
        }

        // Decode base64 content
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        
        // Cache the result
        this.setCache(key, content);
        
        return content;
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error(`Asset not found: ${key}`);
        }
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed');
        }
        if (error.response?.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
          throw new Error('GitHub API rate limit exceeded');
        }
        throw new Error(`Failed to retrieve asset: ${error.message}`);
      }
    }
  }

  async getAssetWithMetadata(key: string, assetCategory?: string): Promise<AssetResponse> {
    this.ensureConfigured();
    
    const dbService = getAssetDatabaseService();
    let databaseVersion: string | undefined;
    let source: 'github' | 'database' = 'github';
    
    // Check if asset exists in database
    if (dbService.isConfigured()) {
      const dbAsset = await dbService.getAsset(key, assetCategory || 'general');
      if (dbAsset) {
        databaseVersion = dbAsset.created_at.toISOString();
      }
    }
    
    try {
      const url = `${this.baseUrl}/repos/${this.repo}/contents/${key}`;
      const response = await axios.get<GitHubFileResponse>(url, {
        headers: this.getHeaders(),
        params: {
          ref: this.branch,
        },
      });

      if (response.data.type !== 'file') {
        throw new Error(`Path ${key} is not a file`);
      }

      // Get commit info for last modified date
      const commitsUrl = `${this.baseUrl}/repos/${this.repo}/commits`;
      const commitsResponse = await axios.get(commitsUrl, {
        headers: this.getHeaders(),
        params: {
          path: key,
          sha: this.branch,
          per_page: 1,
        },
      });

      const lastModified = commitsResponse.data[0]?.commit?.author?.date || new Date().toISOString();

      // Decode base64 content
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      
      // Update database if configured
      if (dbService.isConfigured()) {
        await dbService.storeAsset(key, content, assetCategory || 'general');
      }

      return {
        content,
        sha: response.data.sha,
        size: response.data.size,
        encoding: response.data.encoding,
        lastModified,
        source,
        databaseVersion,
      };
    } catch (error: any) {
      // If GitHub fails but we have it in database
      if (dbService.isConfigured()) {
        const dbAsset = await dbService.getAsset(key, assetCategory || 'general');
        if (dbAsset) {
          const content = typeof dbAsset.data === 'string' 
            ? dbAsset.data 
            : (dbAsset.data.content || JSON.stringify(dbAsset.data));
            
          return {
            content,
            sha: dbAsset.data_hash,
            size: content.length,
            encoding: 'utf-8',
            lastModified: dbAsset.created_at.toISOString(),
            source: 'database',
            databaseVersion: dbAsset.created_at.toISOString(),
          };
        }
      }
      
      if (error.response?.status === 404) {
        throw new Error(`Asset not found: ${key}`);
      }
      throw new Error(`Failed to retrieve asset with metadata: ${error.message}`);
    }
  }

  async listAssets(path: string = ''): Promise<string[]> {
    this.ensureConfigured();
    
    try {
      const url = `${this.baseUrl}/repos/${this.repo}/contents/${path}`;
      const response = await axios.get<GitHubDirectoryItem[]>(url, {
        headers: this.getHeaders(),
        params: {
          ref: this.branch,
        },
      });

      const assets: string[] = [];
      
      for (const item of response.data) {
        if (item.type === 'file') {
          assets.push(item.path);
        } else if (item.type === 'dir') {
          // Recursively get files from subdirectories
          const subAssets = await this.listAssets(item.path);
          assets.push(...subAssets);
        }
      }

      return assets;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw new Error(`Failed to list assets: ${error.message}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForKey(key: string): void {
    const cacheKey = this.getCacheKey(key);
    this.cache.delete(cacheKey);
  }
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export a getter function that creates the instance lazily
let instance: GitHubAssetService | null = null;

export const getGitHubAssetService = (): GitHubAssetService => {
  if (!instance) {
    instance = new GitHubAssetService();
  }
  return instance;
};