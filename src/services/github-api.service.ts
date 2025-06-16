import { storageUtils } from '../utils/storageUtils';
import { GitHubFile, GitHubTree, GitHubRateLimit } from '../types/github';

export class GitHubApiService {
  private static apiUrlPromise: Promise<string> | null = null;

  private static async getApiBaseUrl(): Promise<string> {
    if (!this.apiUrlPromise) {
      this.apiUrlPromise = storageUtils.getApiUrl();
    }
    return this.apiUrlPromise;
  }

  // Check GitHub connection status
  static async checkStatus(): Promise<{
    connected: boolean;
    repository?: string;
    dataFolder?: string;
    promptsFolder?: string;
    rateLimit?: GitHubRateLimit;
    error?: string;
  }> {
    try {
      const apiUrl = await this.getApiBaseUrl();
      const response = await fetch(`${apiUrl}/github/status`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check GitHub status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('GitHub status check failed:', error);
      throw error;
    }
  }

  // Get repository info
  static async getRepository(): Promise<{
    name: string;
    full_name: string;
    description: string;
    private: boolean;
    default_branch: string;
  }> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/github/repository`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get repository info');
    }
    
    const data = await response.json();
    return data.repository;
  }

  // Get tree structure
  static async getTree(path: string = ''): Promise<GitHubTree> {
    const apiUrl = await this.getApiBaseUrl();
    const url = new URL(`${apiUrl}/github/tree`);
    if (path) {
      url.searchParams.append('path', path);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get tree');
    }
    
    const data = await response.json();
    return data.tree;
  }

  // Get files by folder
  static async getFiles(folder: string): Promise<GitHubFile[]> {
    const apiUrl = await this.getApiBaseUrl();
    const url = new URL(`${apiUrl}/github/files`);
    url.searchParams.append('folder', folder);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get files');
    }
    
    const data = await response.json();
    return data.files;
  }

  // Get file content
  static async getFileContent(path: string): Promise<{
    name: string;
    path: string;
    content: string;
    size: number;
  }> {
    const apiUrl = await this.getApiBaseUrl();
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const response = await fetch(`${apiUrl}/github/file/${cleanPath}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get file content');
    }
    
    const data = await response.json();
    return data.file;
  }

  // Search files
  static async searchFiles(queryOrPath: string, extension?: string): Promise<GitHubFile[]> {
    const apiUrl = await this.getApiBaseUrl();
    const url = new URL(`${apiUrl}/github/search`);
    
    // If queryOrPath looks like a path (contains / or is a known folder name), treat it as path
    if (queryOrPath && (queryOrPath.includes('/') || ['data', 'prompts'].includes(queryOrPath))) {
      url.searchParams.append('path', queryOrPath);
      url.searchParams.append('q', ''); // Empty query
    } else {
      url.searchParams.append('q', queryOrPath);
    }
    
    if (extension) {
      url.searchParams.append('extension', extension);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search files');
    }
    
    const data = await response.json();
    return data.files;
  }

  // Get files by extension
  static async getFilesByExtension(extension: string): Promise<GitHubFile[]> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/github/files-by-extension/${extension}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get files by extension');
    }
    
    const data = await response.json();
    return data.files;
  }

  // Get rate limit
  static async getRateLimit(): Promise<GitHubRateLimit> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/github/rate-limit`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get rate limit');
    }
    
    const data = await response.json();
    return data.rateLimit;
  }
}