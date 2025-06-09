import { GitHubFile } from '../types/github';

/**
 * Filter files by extension
 */
export function filterFilesByExtension(files: GitHubFile[], extensions: string[]): GitHubFile[] {
  const normalizedExtensions = extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
  return files.filter(file => 
    file.type === 'file' && 
    normalizedExtensions.some(ext => file.name.endsWith(ext))
  );
}

/**
 * Build file tree structure from flat list
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileTreeNode[];
}

export function buildFileTree(files: GitHubFile[]): FileTreeNode {
  const root: FileTreeNode = {
    name: '/',
    path: '',
    type: 'dir',
    children: []
  };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');
      
      if (!current.children) {
        current.children = [];
      }
      
      let child = current.children.find(c => c.name === part);
      
      if (!child) {
        child = {
          name: part,
          path: path,
          type: isLastPart ? file.type : 'dir',
          children: isLastPart && file.type === 'dir' ? [] : undefined
        };
        current.children.push(child);
      }
      
      if (!isLastPart) {
        current = child;
      }
    });
  });
  
  return root;
}

/**
 * Sort files with directories first
 */
export function sortFiles(files: GitHubFile[]): GitHubFile[] {
  return [...files].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1) : '';
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if path is in a directory
 */
export function isInDirectory(filePath: string, directory: string): boolean {
  const normalizedPath = filePath.toLowerCase();
  const normalizedDir = directory.toLowerCase();
  return normalizedPath.startsWith(normalizedDir + '/') || normalizedPath === normalizedDir;
}

/**
 * Get parent directory path
 */
export function getParentPath(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.substring(0, lastSlash) : '';
}

/**
 * Extract filename from path
 */
export function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}