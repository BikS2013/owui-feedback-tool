import { 
  GitHubFile, 
  GitHubTree, 
  GitHubError, 
  GitHubRateLimitResponse,
  GitHubRepository,
  GitHubSearchResult 
} from '../types/github.types.js';

export class GitHubService {
  private static readonly BASE_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
  private readonly repo: string;
  private readonly token?: string;
  
  constructor() {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    
    if (!repo) {
      throw new Error('GitHub repository not configured. Please set GITHUB_REPO in .env file');
    }
    
    this.repo = repo;
    this.token = token;
  }
  
  // Build headers with optional authentication
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }
  
  // Handle API errors
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: GitHubError;
      try {
        error = await response.json();
      } catch {
        error = {
          message: `HTTP error! status: ${response.status}`,
          status: response.status
        };
      }
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<GitHubRepository> {
    const url = `${GitHubService.BASE_URL}/repos/${this.repo}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<GitHubRepository>(response);
  }
  
  /**
   * Get list of files in a repository directory
   * @param path - Optional path within the repository (default: root)
   */
  async getFiles(path: string = ''): Promise<GitHubFile[]> {
    const url = `${GitHubService.BASE_URL}/repos/${this.repo}/contents/${path}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<GitHubFile[]>(response);
  }
  
  /**
   * Get repository tree (all files recursively)
   * @param sha - Tree SHA (default: 'HEAD')
   * @param recursive - Whether to fetch recursively
   */
  async getTree(sha: string = 'HEAD', recursive: boolean = true): Promise<GitHubTree> {
    // If sha is 'HEAD', we need to get the default branch first
    if (sha === 'HEAD') {
      const repoInfo = await this.getRepositoryInfo();
      sha = repoInfo.default_branch;
    }
    
    const url = `${GitHubService.BASE_URL}/repos/${this.repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<GitHubTree>(response);
  }
  
  /**
   * Get file content
   * @param path - File path within the repository
   */
  async getFileContent(path: string): Promise<{ content: string; encoding: string; sha: string; size: number }> {
    const url = `${GitHubService.BASE_URL}/repos/${this.repo}/contents/${path}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<any>(response);
    
    if (data.type !== 'file') {
      throw new Error(`Path ${path} is not a file`);
    }
    
    return {
      content: data.content,
      encoding: data.encoding,
      sha: data.sha,
      size: data.size
    };
  }
  
  /**
   * Get file content as text
   * @param path - File path within the repository
   */
  async getFileContentAsText(path: string): Promise<string> {
    const { content, encoding } = await this.getFileContent(path);
    
    if (encoding === 'base64') {
      return Buffer.from(content, 'base64').toString('utf-8');
    }
    
    return content;
  }
  
  /**
   * Search for files in repository
   * @param query - Search query
   * @param options - Search options
   */
  async searchFiles(
    query: string,
    options: { 
      path?: string; 
      extension?: string;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ name: string; path: string; html_url: string }>> {
    // Build search query
    let searchQuery = `${query} repo:${this.repo}`;
    if (options.path) {
      searchQuery += ` path:${options.path}`;
    }
    if (options.extension) {
      searchQuery += ` extension:${options.extension}`;
    }
    
    const url = `${GitHubService.BASE_URL}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${options.maxResults || 30}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<GitHubSearchResult>(response);
    
    return data.items.map(item => ({
      name: item.name,
      path: item.path,
      html_url: item.html_url
    }));
  }
  
  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<GitHubRateLimitResponse> {
    const url = `${GitHubService.BASE_URL}/rate_limit`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<GitHubRateLimitResponse>(response);
  }
  
  /**
   * List all files with a specific extension
   * @param extension - File extension (without dot)
   */
  async getFilesByExtension(extension: string): Promise<string[]> {
    const tree = await this.getTree('HEAD', true);
    
    return tree.tree
      .filter(item => item.type === 'blob' && item.path?.endsWith(`.${extension}`))
      .map(item => item.path);
  }
  
  /**
   * Check if GitHub is configured and accessible
   */
  async checkConnection(): Promise<{ 
    success: boolean; 
    repository?: string; 
    rateLimit?: { limit: number; remaining: number; reset: Date };
    error?: string;
  }> {
    try {
      const [repoInfo, rateLimit] = await Promise.all([
        this.getRepositoryInfo(),
        this.getRateLimit()
      ]);
      
      return {
        success: true,
        repository: repoInfo.full_name,
        rateLimit: {
          limit: rateLimit.rate.limit,
          remaining: rateLimit.rate.remaining,
          reset: new Date(rateLimit.rate.reset * 1000)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to GitHub'
      };
    }
  }
}