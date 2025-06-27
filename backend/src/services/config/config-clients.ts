import { GitHubAssetClient } from '@biks2013/github-asset-client';
import { AssetDatabaseService } from '@biks2013/asset-database';

// Lazy initialization to ensure environment variables are loaded
let _githubClient: GitHubAssetClient | null = null;
let _databaseAssetService: AssetDatabaseService | null = null;

// Get or create GitHub client
function getGitHubClient(): GitHubAssetClient {
  if (!_githubClient) {
    if (!process.env.GITHUB_REPO || !process.env.GITHUB_TOKEN) {
      throw new Error('GITHUB_REPO and GITHUB_TOKEN environment variables are required');
    }
    _githubClient = new GitHubAssetClient({
      repo: process.env.GITHUB_REPO,
      token: process.env.GITHUB_TOKEN,
      branch: process.env.GITHUB_BRANCH || 'main',
      cacheEnabled: true,
      cacheTTL: 300000 // 5 minutes
    });
  }
  return _githubClient;
}

// Get or create database service
function getDatabaseAssetService(): AssetDatabaseService {
  if (!_databaseAssetService) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    _databaseAssetService = new AssetDatabaseService({
      connectionString: process.env.DATABASE_URL,
      ownerCategory: 'config-service',
      ownerKey: process.env.SERVICE_NAME || 'owui-feedback-backend',
      verbose: process.env.CONFIG_VERBOSE === 'true'
    });
  }
  return _databaseAssetService;
}

// Export getter functions
export const githubClient = getGitHubClient;
export const databaseAssetService = getDatabaseAssetService;

// Ensure database schema on startup
export async function ensureConfigSchema(): Promise<void> {
  try {
    const dbService = getDatabaseAssetService();
    await dbService.ensureSchema();
    console.log('✅ Configuration database schema ensured');
  } catch (error) {
    console.error('❌ Failed to ensure configuration database schema:', error);
    // Don't throw - allow app to continue with GitHub-only config
  }
}