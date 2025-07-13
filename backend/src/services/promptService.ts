import { githubClient } from './config/config-clients.js';
import { Octokit } from '@octokit/rest';

interface Prompt {
  name: string;  // This is now the full filename with extension
  description?: string;
  content: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Generic service for managing prompts stored in GitHub
 */
export class PromptService {
  private promptsFolder: string;
  private serviceName: string;

  constructor(promptsFolder: string, serviceName: string) {
    this.promptsFolder = promptsFolder;
    this.serviceName = serviceName;
    
    // Debug: Log initialization
    console.log(`🔍 ${this.serviceName} Service initialized:`);
    console.log(`   📁 Prompts folder: ${this.promptsFolder}`);
    console.log(`   🌐 GitHub repo: ${process.env.GITHUB_REPO}`);
    console.log(`   🌿 Branch: ${process.env.GITHUB_BRANCH || 'main'}`);
  }

  /**
   * List all prompts in the configured folder
   */
  async listPrompts(): Promise<Prompt[]> {
    try {
      console.log(`📋 Listing ${this.serviceName.toLowerCase()}...`);
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
        
        const prompts: Prompt[] = [];
        
        if (Array.isArray(response.data)) {
          console.log(`   📂 Found ${response.data.length} items in folder`);
          for (const file of response.data) {
            console.log(`      🔸 ${file.type}: ${file.name}`);
            if (file.type === 'file' && (file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
              prompts.push({
                name: file.name,  // Use full filename with extension
                content: '', // Content loaded on demand
                createdAt: new Date().toISOString(), // GitHub API doesn't provide these for directory listings
                updatedAt: new Date().toISOString()
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
          console.warn(`   ❌ ${this.serviceName} folder '${this.promptsFolder}' not found in repository`);
          console.warn(`   📍 Full path attempted: ${owner}/${repo}/${this.promptsFolder}`);
          console.warn(`   💡 Please ensure the folder exists in the repository`);
          return [];
        }
        console.error(`   ❌ GitHub API error:`, error.message);
        console.error(`   📍 Status: ${error.status}`);
        throw error;
      }
    } catch (error: any) {
      console.error(`Failed to list ${this.serviceName.toLowerCase()}:`, error);
      throw new Error(`Failed to list ${this.serviceName.toLowerCase()}: ${error.message}`);
    }
  }

  /**
   * Get a specific prompt by filename
   */
  async getPrompt(filename: string): Promise<Prompt | null> {
    try {
      console.log(`📄 Getting ${this.serviceName.toLowerCase()}: ${filename}`);
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
      console.error(`Failed to get ${this.serviceName.toLowerCase()} ${filename}:`, error);
      throw new Error(`Failed to get ${this.serviceName.toLowerCase()}: ${error.message}`);
    }
  }

  /**
   * Create a new prompt
   */
  async createPrompt(filename: string, content: string): Promise<Prompt> {
    try {
      console.log(`📝 Creating ${this.serviceName.toLowerCase()}: ${filename}`);
      console.log(`   📁 Folder: ${this.promptsFolder}`);
      
      const [owner, repo] = process.env.GITHUB_REPO!.split('/');
      const path = `${this.promptsFolder}/${filename}`;
      console.log(`   📍 Full path: ${path}`);
      console.log(`   🌐 Using Octokit API`);
      
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Create ${this.serviceName.toLowerCase()}: ${filename}`,
        content: Buffer.from(content).toString('base64'),
        branch: process.env.GITHUB_BRANCH || 'main'
      });
      
      console.log(`   ✅ Successfully created prompt at: ${path}`);
      
      return {
        name: filename,
        content: content,
        description: this.extractDescription(content),
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to create ${this.serviceName.toLowerCase()} ${filename}:`, error);
      throw new Error(`Failed to create ${this.serviceName.toLowerCase()}: ${error.message}`);
    }
  }

  /**
   * Update an existing prompt
   */
  async updatePrompt(filename: string, content: string): Promise<Prompt> {
    try {
      console.log(`✏️  Updating ${this.serviceName.toLowerCase()}: ${filename}`);
      
      const [owner, repo] = process.env.GITHUB_REPO!.split('/');
      const path = `${this.promptsFolder}/${filename}`;
      
      // Verify the file exists first
      console.log(`   🔍 Verifying prompt exists...`);
      const existing = await this.getPrompt(filename);
      if (!existing) {
        console.log(`   ❌ Prompt ${filename} not found`);
        throw new Error(`Prompt ${filename} not found`);
      }
      
      console.log(`   📍 Updating at path: ${path}`);
      console.log(`   🌐 Using Octokit API`);
      
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      // Get the current file SHA
      const fileInfo = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: process.env.GITHUB_BRANCH || 'main'
      });
      
      if (!Array.isArray(fileInfo.data) && 'sha' in fileInfo.data) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: `Update ${this.serviceName.toLowerCase()}: ${filename}`,
          content: Buffer.from(content).toString('base64'),
          sha: fileInfo.data.sha,
          branch: process.env.GITHUB_BRANCH || 'main'
        });
      }
      
      console.log(`   ✅ Successfully updated prompt at: ${path}`);
      
      return {
        name: filename,
        content: content,
        description: this.extractDescription(content),
        updatedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`   ❌ Failed to update ${this.serviceName.toLowerCase()} ${filename}:`, error);
      throw new Error(`Failed to update ${this.serviceName.toLowerCase()}: ${error.message}`);
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(filename: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting ${this.serviceName.toLowerCase()}: ${filename}`);
      
      const [owner, repo] = process.env.GITHUB_REPO!.split('/');
      const path = `${this.promptsFolder}/${filename}`;
      
      // Verify the file exists first
      console.log(`   🔍 Verifying prompt exists...`);
      const existing = await this.getPrompt(filename);
      if (!existing) {
        console.log(`   ❌ Prompt ${filename} not found`);
        throw new Error(`Prompt ${filename} not found`);
      }
      
      console.log(`   📍 Deleting from path: ${path}`);
      console.log(`   🌐 Using Octokit API`);
      
      const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      
      // Get the current file SHA
      const fileInfo = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: process.env.GITHUB_BRANCH || 'main'
      });
      
      if (!Array.isArray(fileInfo.data) && 'sha' in fileInfo.data) {
        await octokit.repos.deleteFile({
          owner,
          repo,
          path,
          message: `Delete ${this.serviceName.toLowerCase()}: ${filename}`,
          sha: fileInfo.data.sha,
          branch: process.env.GITHUB_BRANCH || 'main'
        });
      }
      
      console.log(`   ✅ Successfully deleted prompt at: ${path}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to delete ${this.serviceName.toLowerCase()} ${filename}:`, error);
      throw new Error(`Failed to delete ${this.serviceName.toLowerCase()}: ${error.message}`);
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

// Factory functions for creating specific prompt services
export const createUserPromptService = () => {
  const folder = process.env.USER_PROMPTS_FOLDER;
  if (!folder) {
    throw new Error('USER_PROMPTS_FOLDER environment variable is required');
  }
  return new PromptService(folder, 'User Prompts');
};

export const createSystemPromptService = () => {
  const folder = process.env.SYSTEM_PROMPTS_FOLDER;
  if (!folder) {
    throw new Error('SYSTEM_PROMPTS_FOLDER environment variable is required');
  }
  return new PromptService(folder, 'System Prompts');
};

// Export lazy-initialized singleton instances
let _userPromptService: PromptService | null = null;
let _systemPromptService: PromptService | null = null;

export const userPromptService = {
  listPrompts: async () => {
    if (!_userPromptService) {
      _userPromptService = createUserPromptService();
    }
    return _userPromptService.listPrompts();
  },
  
  getPrompt: async (filename: string) => {
    if (!_userPromptService) {
      _userPromptService = createUserPromptService();
    }
    return _userPromptService.getPrompt(filename);
  },
  
  createPrompt: async (filename: string, content: string) => {
    if (!_userPromptService) {
      _userPromptService = createUserPromptService();
    }
    return _userPromptService.createPrompt(filename, content);
  },
  
  updatePrompt: async (filename: string, content: string) => {
    if (!_userPromptService) {
      _userPromptService = createUserPromptService();
    }
    return _userPromptService.updatePrompt(filename, content);
  },
  
  deletePrompt: async (filename: string) => {
    if (!_userPromptService) {
      _userPromptService = createUserPromptService();
    }
    return _userPromptService.deletePrompt(filename);
  }
};

export const systemPromptService = {
  listPrompts: async () => {
    if (!_systemPromptService) {
      _systemPromptService = createSystemPromptService();
    }
    return _systemPromptService.listPrompts();
  },
  
  getPrompt: async (filename: string) => {
    if (!_systemPromptService) {
      _systemPromptService = createSystemPromptService();
    }
    return _systemPromptService.getPrompt(filename);
  },
  
  createPrompt: async (filename: string, content: string) => {
    if (!_systemPromptService) {
      _systemPromptService = createSystemPromptService();
    }
    return _systemPromptService.createPrompt(filename, content);
  },
  
  updatePrompt: async (filename: string, content: string) => {
    if (!_systemPromptService) {
      _systemPromptService = createSystemPromptService();
    }
    return _systemPromptService.updatePrompt(filename, content);
  },
  
  deletePrompt: async (filename: string) => {
    if (!_systemPromptService) {
      _systemPromptService = createSystemPromptService();
    }
    return _systemPromptService.deletePrompt(filename);
  }
};