import { githubClient } from './config/config-clients.js';

interface UserPrompt {
  id: string;
  name: string;
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
              const id = file.name.replace(/\.(txt|md)$/, '');
              prompts.push({
                id,
                name: file.name,
                content: '', // Content loaded on demand
                createdAt: file.created_at,
                updatedAt: file.updated_at
              });
              console.log(`      ✅ Added prompt: ${file.name} (id: ${id})`);
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
   * Get a specific user prompt by ID
   */
  async getPrompt(promptId: string): Promise<UserPrompt | null> {
    try {
      console.log(`📄 Getting user prompt: ${promptId}`);
      console.log(`   🔍 Looking in folder: ${this.promptsFolder}`);
      
      const client = githubClient();
      
      // Try with .txt extension first, then .md
      const extensions = ['.txt', '.md'];
      console.log(`   📝 Will try extensions: ${extensions.join(', ')}`);
      
      for (const ext of extensions) {
        try {
          const path = `${this.promptsFolder}/${promptId}${ext}`;
          console.log(`   🔍 Trying path: ${path}`);
          console.log(`   🌐 Using GitHubAssetClient.getAsset()`);
          const content = await client.getAsset(path);
          
          if (content) {
            console.log(`   ✅ Found prompt at: ${path}`);
            console.log(`   📏 Content length: ${content.length} characters`);
            return {
              id: promptId,
              name: `${promptId}${ext}`,
              content: content,
              description: this.extractDescription(content)
            };
          }
        } catch (error: any) {
          console.log(`   ❌ Not found at: ${this.promptsFolder}/${promptId}${ext}`);
          console.log(`      Error: ${error.message || error}`);
          // Continue to next extension
        }
      }
      
      console.log(`   ⚠️  Prompt not found with any extension`);
      return null;
    } catch (error: any) {
      console.error(`Failed to get user prompt ${promptId}:`, error);
      throw new Error(`Failed to get user prompt: ${error.message}`);
    }
  }

  /**
   * Create a new user prompt
   */
  async createPrompt(promptId: string, content: string, extension: string = '.txt'): Promise<UserPrompt> {
    try {
      console.log(`📝 Creating user prompt: ${promptId}`);
      console.log(`   📁 Folder: ${this.promptsFolder}`);
      console.log(`   📄 Extension: ${extension}`);
      
      const client = githubClient();
      const path = `${this.promptsFolder}/${promptId}${extension}`;
      console.log(`   📍 Full path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.saveAsset()`);
      
      await client.saveAsset(path, content);
      console.log(`   ✅ Successfully created prompt at: ${path}`);
      
      return {
        id: promptId,
        name: `${promptId}${extension}`,
        content: content,
        description: this.extractDescription(content),
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to create user prompt ${promptId}:`, error);
      throw new Error(`Failed to create user prompt: ${error.message}`);
    }
  }

  /**
   * Update an existing user prompt
   */
  async updatePrompt(promptId: string, content: string): Promise<UserPrompt> {
    try {
      console.log(`✏️  Updating user prompt: ${promptId}`);
      
      const client = githubClient();
      
      // Find existing file with extension
      console.log(`   🔍 Finding existing prompt...`);
      const existing = await this.getPrompt(promptId);
      if (!existing) {
        console.log(`   ❌ Prompt ${promptId} not found`);
        throw new Error(`Prompt ${promptId} not found`);
      }
      
      const path = `${this.promptsFolder}/${existing.name}`;
      console.log(`   📍 Updating at path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.saveAsset()`);
      
      await client.saveAsset(path, content);
      console.log(`   ✅ Successfully updated prompt at: ${path}`);
      
      return {
        id: promptId,
        name: existing.name,
        content: content,
        description: this.extractDescription(content),
        updatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to update user prompt ${promptId}:`, error);
      throw new Error(`Failed to update user prompt: ${error.message}`);
    }
  }

  /**
   * Delete a user prompt
   */
  async deletePrompt(promptId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting user prompt: ${promptId}`);
      
      const client = githubClient();
      
      // Find existing file with extension
      console.log(`   🔍 Finding existing prompt...`);
      const existing = await this.getPrompt(promptId);
      if (!existing) {
        console.log(`   ❌ Prompt ${promptId} not found`);
        throw new Error(`Prompt ${promptId} not found`);
      }
      
      const path = `${this.promptsFolder}/${existing.name}`;
      console.log(`   📍 Deleting from path: ${path}`);
      console.log(`   🌐 Using GitHubAssetClient.deleteAsset()`);
      
      await client.deleteAsset(path);
      console.log(`   ✅ Successfully deleted prompt at: ${path}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to delete user prompt ${promptId}:`, error);
      throw new Error(`Failed to delete user prompt: ${error.message}`);
    }
  }

  /**
   * Extract description from prompt content (first line or comment)
   */
  private extractDescription(content: string): string {
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
  
  getPrompt: async (promptId: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.getPrompt(promptId);
  },
  
  createPrompt: async (promptId: string, content: string, extension: string = '.txt') => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.createPrompt(promptId, content, extension);
  },
  
  updatePrompt: async (promptId: string, content: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.updatePrompt(promptId, content);
  },
  
  deletePrompt: async (promptId: string) => {
    if (!_userPromptService) {
      _userPromptService = new UserPromptService();
    }
    return _userPromptService.deletePrompt(promptId);
  }
};