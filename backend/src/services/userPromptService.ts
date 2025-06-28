import { githubClient } from './config/config-clients.js';

interface UserPrompt {
  name: string;  // This is now the full filename with extension
  description?: string;
  content: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Service for managing user prompts stored in GitHub
 */
export class UserPromptService {
  private promptsFolder: string;

  constructor() {
    const folder = process.env.USER_PROMPTS_FOLDER;
    if (!folder) {
      throw new Error('USER_PROMPTS_FOLDER environment variable is required');
    }
    this.promptsFolder = folder;
    
    // Debug: Log initialization
    console.log('🔍 UserPromptService initialized:');
    console.log(`   📁 Prompts folder: ${this.promptsFolder}`);
    console.log(`   🌐 GitHub repo: ${process.env.GITHUB_REPO}`);
    console.log(`   🌿 Branch: ${process.env.GITHUB_BRANCH || 'main'}`);
  }

  /**
   * List all user prompts in the configured folder
   */
  async listPrompts(): Promise<UserPrompt[]> {
    try {
      console.log('📋 Listing user prompts...');
      console.log(`   🔍 Looking in: ${this.promptsFolder}`);
      
      const client = githubClient();
      
      // Use GitHub API directly to list contents of the folder
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      const [owner, repo] = process.env.GITHUB_REPO!.split('/');
      console.log(`   📦 Repository: ${owner}/${repo}`);
      console.log(`   🌿 Branch: ${process.env.GITHUB_BRANCH || 'main'}`);
      
      try {
        console.log(`   🌐 Calling GitHub API: GET /repos/${owner}/${repo}/contents/${this.promptsFolder}`);
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: this.promptsFolder,
          ref: process.env.GITHUB_BRANCH || 'main'
        });
        
        const prompts: UserPrompt[] = [];
        
        if (Array.isArray(response.data)) {
          console.log(`   📂 Found ${response.data.length} items in folder`);
          for (const file of response.data) {
            console.log(`      🔸 ${file.type}: ${file.name}`);
            if (file.type === 'file' && (file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
              prompts.push({
                name: file.name,  // Use full filename with extension
                content: '', // Content loaded on demand
                createdAt: file.created_at,
                updatedAt: file.updated_at
              });
              console.log(`      ✅ Added prompt: ${file.name}`);
            } else if (file.type === 'file') {
              console.log(`      ⏭️  Skipping non-prompt file: ${file.name}`);
            }
          }
        } else {
          console.log('   ⚠️  Response is not an array - might be a single file');
        }
        
        console.log(`   ✅ Total prompts found: ${prompts.length}`);
        return prompts;
      } catch (error: any) {
        if (error.status === 404) {
          // Folder doesn't exist, return empty array
          console.warn(`   ❌ User prompts folder '${this.promptsFolder}' not found in repository`);
          console.warn(`   📍 Full path attempted: ${owner}/${repo}/${this.promptsFolder}`);
          console.warn(`   💡 Please ensure the folder exists in the repository`);
          return [];
        }
        console.error(`   ❌ GitHub API error:`, error.message);
        console.error(`   📍 Status: ${error.status}`);
        throw error;
      }
    } catch (error: any) {
      console.error('Failed to list user prompts:', error);
      throw new Error(`Failed to list user prompts: ${error.message}`);
    }
  }

  /**
   * Get a specific user prompt by filename
   */
  async getPrompt(filename: string): Promise<UserPrompt | null> {
    try {
      console.log(`📄 Getting user prompt: ${filename}`);
      console.log(`   🔍 Looking in folder: ${this.promptsFolder}`);
      
      const client = githubClient();
      
      // Use the full filename as provided
      const path = `${this.promptsFolder}/${filename}`;
      console.log(`   🔍 Trying path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.getAsset()`);
      
      try {
        const result = await client.getAsset(path);
        
        // Handle both string and object responses
        const content = typeof result === 'string' ? result : result?.content || '';
        
        if (content) {
          console.log(`   ✅ Found prompt at: ${path}`);
          console.log(`   📏 Content length: ${content.length} characters`);
          return {
            name: filename,
            content: content,
            description: this.extractDescription(content)
          };
        }
      } catch (error: any) {
        console.log(`   ❌ Not found at: ${path}`);
        console.log(`      Error: ${error.message || error}`);
      }
      
      console.log(`   ⚠️  Prompt not found: ${filename}`);
      return null;
    } catch (error: any) {
      console.error(`Failed to get user prompt ${filename}:`, error);
      throw new Error(`Failed to get user prompt: ${error.message}`);
    }
  }

  /**
   * Create a new user prompt
   */
  async createPrompt(filename: string, content: string): Promise<UserPrompt> {
    try {
      console.log(`📝 Creating user prompt: ${filename}`);
      console.log(`   📁 Folder: ${this.promptsFolder}`);
      
      const client = githubClient();
      const path = `${this.promptsFolder}/${filename}`;
      console.log(`   📍 Full path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.saveAsset()`);
      
      await client.saveAsset(path, content);
      console.log(`   ✅ Successfully created prompt at: ${path}`);
      
      return {
        name: filename,
        content: content,
        description: this.extractDescription(content),
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to create user prompt ${filename}:`, error);
      throw new Error(`Failed to create user prompt: ${error.message}`);
    }
  }

  /**
   * Update an existing user prompt
   */
  async updatePrompt(filename: string, content: string): Promise<UserPrompt> {
    try {
      console.log(`✏️  Updating user prompt: ${filename}`);
      
      const client = githubClient();
      
      // Verify the file exists first
      console.log(`   🔍 Verifying prompt exists...`);
      const existing = await this.getPrompt(filename);
      if (!existing) {
        console.log(`   ❌ Prompt ${filename} not found`);
        throw new Error(`Prompt ${filename} not found`);
      }
      
      const path = `${this.promptsFolder}/${filename}`;
      console.log(`   📍 Updating at path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.saveAsset()`);
      
      await client.saveAsset(path, content);
      console.log(`   ✅ Successfully updated prompt at: ${path}`);
      
      return {
        name: filename,
        content: content,
        description: this.extractDescription(content),
        updatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to update user prompt ${filename}:`, error);
      throw new Error(`Failed to update user prompt: ${error.message}`);
    }
  }

  /**
   * Delete a user prompt
   */
  async deletePrompt(filename: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting user prompt: ${filename}`);
      
      const client = githubClient();
      
      // Verify the file exists first
      console.log(`   🔍 Verifying prompt exists...`);
      const existing = await this.getPrompt(filename);
      if (!existing) {
        console.log(`   ❌ Prompt ${filename} not found`);
        throw new Error(`Prompt ${filename} not found`);
      }
      
      const path = `${this.promptsFolder}/${filename}`;
      console.log(`   📍 Deleting from path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.deleteAsset()`);
      
      await client.deleteAsset(path);
      console.log(`   ✅ Successfully deleted prompt at: ${path}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to delete user prompt ${filename}:`, error);
      throw new Error(`Failed to delete user prompt: ${error.message}`);
    }
  }

  /**
   * Extract description from prompt content (first line or comment)
   */
  private extractDescription(content: string | undefined): string {
    if (!content || typeof content !== 'string') {
      return 'No description';
    }
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.substring(0, 100) + (trimmed.length > 100 ? '...' : '');
      }
    }
    return 'No description';
  }
}

// Export lazy-initialized singleton instance
let _userPromptService: UserPromptService | null = null;

export const userPromptService = {
  listPrompts: async () => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.listPrompts();
  },
  
  getPrompt: async (filename: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.getPrompt(filename);
  },
  
  createPrompt: async (filename: string, content: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.createPrompt(filename, content);
  },
  
  updatePrompt: async (filename: string, content: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.updatePrompt(filename, content);
  },
  
  deletePrompt: async (filename: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.deletePrompt(filename);
  }
};