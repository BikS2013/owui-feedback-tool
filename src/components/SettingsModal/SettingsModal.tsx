import { useState, useEffect } from 'react';
import { X, Activity, Github, ChevronRight, ChevronDown, FileText, Folder } from 'lucide-react';
import { storageUtils } from '../../utils/storageUtils';
import { ApiService } from '../../services/api.service';
import { GitHubService } from '../../services/github.service';
import { buildFileTree, FileTreeNode } from '../../utils/githubUtils';
import { useResizable } from '../../hooks/useResizable';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tree node component
function TreeNode({ node, level = 0 }: { node: FileTreeNode; level?: number }) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Expand first 2 levels by default
  
  const handleToggle = () => {
    if (node.type === 'dir' && node.children) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <div className="tree-node">
      <div 
        className={`tree-node-content ${node.type}`} 
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={handleToggle}
      >
        {node.type === 'dir' && node.children && (
          <span className="tree-node-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span className="tree-node-icon">
          {node.type === 'dir' ? <Folder size={14} /> : <FileText size={14} />}
        </span>
        <span className="tree-node-name">{node.name}</span>
      </div>
      {node.type === 'dir' && node.children && isExpanded && (
        <div className="tree-node-children">
          {node.children.map((child, index) => (
            <TreeNode key={`${child.path}-${index}`} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

type TabType = 'api' | 'github';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [isCheckingGitHub, setIsCheckingGitHub] = useState(false);
  const [githubStatus, setGitHubStatus] = useState<'success' | 'error' | null>(null);
  const [githubTree, setGitHubTree] = useState<FileTreeNode | null>(null);
  const [githubError, setGitHubError] = useState<string | null>(null);
  
  // Use resizable hook
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 400,
    minHeight: 400,
    storageKey: 'settingsModalSize'
  });
  
  
  // Get configuration from environment variables
  const apiUrl = storageUtils.getApiUrl();
  const githubRepo = import.meta.env.VITE_GITHUB_REPO || 'Not configured';
  const hasGitHubToken = !!import.meta.env.VITE_GITHUB_TOKEN;
  const dataFolder = storageUtils.getDataFolder();
  const promptsFolder = storageUtils.getPromptsFolder();

  useEffect(() => {
    if (isOpen) {
      // Reset status when modal opens
      setConnectionStatus(null);
      setGitHubStatus(null);
      setGitHubTree(null);
      setGitHubError(null);
      setActiveTab('api'); // Reset to first tab
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleTestConnection = async () => {
    setIsChecking(true);
    setConnectionStatus(null);
    
    try {
      await ApiService.checkHealth();
      setConnectionStatus('success');
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to connect to server:', error);
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleTestGitHub = async () => {
    if (githubRepo === 'Not configured' || githubRepo === 'owner/repository') {
      setGitHubError('Please configure VITE_GITHUB_REPO in .env file');
      return;
    }
    
    setIsCheckingGitHub(true);
    setGitHubStatus(null);
    setGitHubTree(null);
    setGitHubError(null);
    
    try {
      // First, try to get repository info
      const repoInfo = await GitHubService.getRepositoryInfo();
      console.log('Repository found:', repoInfo.full_name);
      
      // Then get the full tree
      const tree = await GitHubService.getTree('HEAD', true);
      console.log(`Found ${tree.tree.length} items in repository`);
      
      // Convert tree items to file nodes for building the tree
      const fileNodes = tree.tree.map(item => ({
        name: item.path.split('/').pop() || item.path,
        path: item.path,
        type: item.type === 'tree' ? 'dir' as const : 'file' as const,
        size: item.size || 0,
        sha: item.sha,
        url: item.url,
        html_url: '',
        git_url: '',
        download_url: null,
        _links: { self: '', git: '', html: '' }
      }));
      
      // Build the tree structure
      const treeStructure = buildFileTree(fileNodes);
      setGitHubTree(treeStructure);
      setGitHubStatus('success');
    } catch (error: any) {
      setGitHubStatus('error');
      setGitHubError(error.message || 'Failed to connect to GitHub repository');
      console.error('GitHub test failed:', error);
    } finally {
      setIsCheckingGitHub(false);
    }
  };
  

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={(e) => handleOverlayClick(e, onClose)}>
      <div 
        ref={modalRef}
        className={`settings-modal resizable ${isResizing ? 'resizing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Resize handles */}
        <div className="resize-handle resize-handle-n" onMouseDown={(e) => handleResizeStart(e, 'top')} />
        <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
        <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'right')} />
        <div className="resize-handle resize-handle-w" onMouseDown={(e) => handleResizeStart(e, 'left')} />
        <div className="resize-handle resize-handle-ne" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
        <div className="resize-handle resize-handle-nw" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
        <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
        <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            <Activity size={16} />
            API Settings
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            <Github size={16} />
            GitHub Settings
          </button>
        </div>
        
        <div className="settings-modal-content">
          {activeTab === 'api' && (
            <div className="settings-tab-panel">
              <div className="settings-field">
                <label>API Base URL</label>
                <div className="settings-input readonly">
                  {apiUrl}
                </div>
                <p className="settings-help">
                  Configured in .env file (VITE_API_URL)
                </p>
              </div>

              {connectionStatus === 'success' && (
                <div className="settings-status success">
                  ✓ Successfully connected to server
                </div>
              )}
              
              {connectionStatus === 'error' && (
                <div className="settings-status error">
                  ✗ Failed to connect to server. Please check the URL and ensure the server is running.
                </div>
              )}
              
              <button
                type="button"
                className="settings-button primary"
                onClick={handleTestConnection}
                disabled={isChecking}
              >
                <Activity size={16} />
                {isChecking ? 'Testing...' : 'Test API Connection'}
              </button>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="settings-tab-panel">
              <div className="settings-field">
                <label>Repository</label>
                <div className="settings-input readonly">
                  <Github size={16} />
                  {githubRepo}
                </div>
                <p className="settings-help">
                  Configured in .env file (VITE_GITHUB_REPO)
                  {hasGitHubToken && <span className="token-indicator"> • Token configured</span>}
                </p>
              </div>

              <div className="settings-field">
                <label>Data Folder</label>
                <div className="settings-input readonly">
                  <Folder size={16} />
                  {dataFolder}
                </div>
                <p className="settings-help">
                  Configured in .env file (VITE_GITHUB_DATA_FOLDER)
                </p>
              </div>

              <div className="settings-field">
                <label>Prompts Folder</label>
                <div className="settings-input readonly">
                  <Folder size={16} />
                  {promptsFolder}
                </div>
                <p className="settings-help">
                  Configured in .env file (VITE_GITHUB_PROMPTS_FOLDER)
                </p>
              </div>

              {githubError && (
                <div className="settings-status error">
                  ✗ {githubError}
                </div>
              )}

              {githubStatus === 'success' && (
                <div className="settings-status success">
                  ✓ Successfully connected to GitHub repository
                </div>
              )}
              
              <button
                type="button"
                className="settings-button primary"
                onClick={handleTestGitHub}
                disabled={isCheckingGitHub || githubRepo === 'Not configured'}
              >
                <Github size={16} />
                {isCheckingGitHub ? 'Loading Repository...' : 'Test GitHub Access'}
              </button>

              {githubTree && (
                <div className="github-tree-container">
                  <h4>Repository Structure</h4>
                  <div className="github-tree">
                    {githubTree.children?.map((child, index) => (
                      <TreeNode key={`${child.path}-${index}`} node={child} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-modal-footer">
          <button
            type="button"
            className="settings-button secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}