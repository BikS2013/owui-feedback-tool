import { GitHubFile, GitHubTree, GitHubError, GitHubRateLimit } from '../types/github';

export class GitHubService {
  private static readonly BASE_URL = 'https://api.github.com';
  
  // Get configuration from environment variables
  private static getConfig() {
    const repo = import.meta.env.VITE_GITHUB_REPO;
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    
    if (!repo) {
      throw new Error('GitHub repository not configured. Please set VITE_GITHUB_REPO in .env file');
    }
    
    return { repo, token };
  }
  
  // Build headers with optional authentication
  private static getHeaders(): HeadersInit {
    const { token } = this.getConfig();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }
  
  // Handle API errors
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: GitHubError = await response.json().catch(() => ({
        message: `HTTP error! status: ${response.status}`,
        status: response.status
      }));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get list of files in a repository directory
   * @param path - Optional path within the repository (default: root)
   * @returns Array of files and directories
   */
  static async getFiles(path: string = ''): Promise<GitHubFile[]> {
    const { repo } = this.getConfig();
    const url = `${this.BASE_URL}/repos/${repo}/contents/${path}`;
    
    console.log('GitHub API request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    // Log response headers to check for truncation warnings
    console.log('GitHub API response headers:', {
      status: response.status,
      rateLimit: response.headers.get('x-ratelimit-remaining'),
      truncated: response.headers.get('x-github-media-type')
    });
    
    const data = await this.handleResponse<GitHubFile[]>(response);
    
    // GitHub Contents API has a limit of 1000 files per directory
    // If we're getting close to that limit, we might be missing files
    if (Array.isArray(data) && data.length >= 100) {
      console.warn(`Warning: Directory contains ${data.length} items. GitHub Contents API has a limit of 1000 files per directory.`);
    }
    
    return data;
  }
  
  /**
   * Get repository tree (all files recursively)
   * @param sha - Tree SHA (default: 'HEAD')
   * @param recursive - Whether to fetch recursively
   * @returns GitHub tree structure
   */
  static async getTree(sha: string = 'HEAD', recursive: boolean = true): Promise<GitHubTree> {
    const { repo } = this.getConfig();
    const url = `${this.BASE_URL}/repos/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<GitHubTree>(response);
  }
  
  /**
   * Get file content
   * @param path - File path within the repository
   * @returns File content as base64 encoded string
   */
  static async getFileContent(path: string): Promise<{ content: string; encoding: string; sha: string }> {
    const { repo } = this.getConfig();
    const url = `${this.BASE_URL}/repos/${repo}/contents/${path}`;
    
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
      sha: data.sha
    };
  }
  
  /**
   * Get file content as text
   * @param path - File path within the repository
   * @returns Decoded file content
   */
  static async getFileContentAsText(path: string): Promise<string> {
    const { content, encoding } = await this.getFileContent(path);
    
    if (encoding === 'base64') {
      return atob(content);
    }
    
    return content;
  }
  
  /**
   * Search for files in repository
   * @param query - Search query
   * @param options - Search options
   * @returns Search results
   */
  static async searchFiles(
    query: string,
    options: { 
      path?: string; 
      extension?: string;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ name: string; path: string; html_url: string }>> {
    const { repo } = this.getConfig();
    
    // Build search query
    let searchQuery = `${query} repo:${repo}`;
    if (options.path) {
      searchQuery += ` path:${options.path}`;
    }
    if (options.extension) {
      searchQuery += ` extension:${options.extension}`;
    }
    
    const url = `${this.BASE_URL}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${options.maxResults || 30}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<any>(response);
    
    return data.items.map((item: any) => ({
      name: item.name,
      path: item.path,
      html_url: item.html_url
    }));
  }
  
  /**
   * Get rate limit status
   * @returns Current rate limit information
   */
  static async getRateLimit(): Promise<GitHubRateLimit> {
    const url = `${this.BASE_URL}/rate_limit`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<any>(response);
    return data.rate;
  }
  
  /**
   * List all files with a specific extension
   * @param extension - File extension (without dot)
   * @returns Array of file paths
   */
  static async getFilesByExtension(extension: string): Promise<string[]> {
    const tree = await this.getTree('HEAD', true);
    
    return tree.tree
      .filter(item => item.type === 'blob' && item.path?.endsWith(`.${extension}`))
      .map(item => item.path);
  }
  
  /**
   * Get repository information
   * @returns Repository metadata
   */
  static async getRepositoryInfo(): Promise<any> {
    const { repo } = this.getConfig();
    const url = `${this.BASE_URL}/repos/${repo}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<any>(response);
  }
  
  /**
   * Get files in a directory using the tree API (handles large directories better)
   * @param path - Directory path within the repository
   * @returns Array of files in GitHubFile format
   */
  static async getFilesUsingTree(path: string = ''): Promise<GitHubFile[]> {
    const { repo } = this.getConfig();
    
    // First, get the default branch
    const repoInfo = await this.getRepositoryInfo();
    const defaultBranch = repoInfo.default_branch || 'main';
    
    // Get the tree for the repository
    const tree = await this.getTree(defaultBranch, true);
    
    // Filter for files in the specified path
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : '';
    
    const filesInPath = tree.tree
      .filter(item => {
        if (!pathPrefix) {
          // Root directory - only include items without '/' in path
          return !item.path.includes('/');
        }
        // Include items that start with the path prefix
        if (!item.path.startsWith(pathPrefix)) return false;
        // Check if it's a direct child (no additional '/' after the prefix)
        const relativePath = item.path.substring(pathPrefix.length);
        return !relativePath.includes('/');
      })
      .map(item => ({
        name: pathPrefix ? item.path.substring(pathPrefix.length) : item.path,
        path: item.path,
        sha: item.sha,
        size: item.size || 0,
        url: `${this.BASE_URL}/repos/${repo}/contents/${item.path}`,
        html_url: `https://github.com/${repo}/blob/${defaultBranch}/${item.path}`,
        git_url: `${this.BASE_URL}/repos/${repo}/git/blobs/${item.sha}`,
        download_url: `https://raw.githubusercontent.com/${repo}/${defaultBranch}/${item.path}`,
        type: item.type === 'blob' ? 'file' : 'dir' as 'file' | 'dir',
        _links: {
          self: `${this.BASE_URL}/repos/${repo}/contents/${item.path}`,
          git: `${this.BASE_URL}/repos/${repo}/git/blobs/${item.sha}`,
          html: `https://github.com/${repo}/blob/${defaultBranch}/${item.path}`
        }
      }));
    
    console.log(`Found ${filesInPath.length} files in ${path || 'root'} using tree API`);
    return filesInPath;
  }
}

export const githubService = GitHubService;