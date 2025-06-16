import { useState, useEffect } from 'react';
import { X, Activity, Github, ChevronRight, ChevronDown, FileText, Folder, Monitor, Info } from 'lucide-react';
import { storageUtils, DisplayMode } from '../../utils/storageUtils';
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

type TabType = 'api' | 'github' | 'display';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [isCheckingGitHub, setIsCheckingGitHub] = useState(false);
  const [githubStatus, setGitHubStatus] = useState<'success' | 'error' | null>(null);
  const [githubTree, setGitHubTree] = useState<FileTreeNode | null>(null);
  const [githubError, setGitHubError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(storageUtils.getDisplayMode());
  const [runtimeConfigStatus, setRuntimeConfigStatus] = useState<'loading' | 'runtime' | 'buildtime'>('loading');
  
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
  const [apiUrl, setApiUrl] = useState<string>(storageUtils.getApiUrlSync());
  const githubRepo = import.meta.env.VITE_GITHUB_REPO || 'Not configured';
  const hasGitHubToken = !!import.meta.env.VITE_GITHUB_TOKEN;
  const dataFolder = storageUtils.getDataFolder();
  const promptsFolder = storageUtils.getPromptsFolder();

  // Load the actual API URL asynchronously and check if it's from runtime config
  useEffect(() => {
    storageUtils.getApiUrl().then(url => {
      setApiUrl(url);
      // Check if the URL matches the build-time value to determine the source
      const buildTimeUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      if (url !== buildTimeUrl) {
        setRuntimeConfigStatus('runtime');
      } else {
        setRuntimeConfigStatus('buildtime');
      }
    });
  }, []);

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
  
  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    storageUtils.setDisplayMode(mode);
    // Mode change will be reflected immediately without reload
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
          <button
            type="button"
            className={`settings-tab ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            <Monitor size={16} />
            Display
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
                  Currently using the API URL shown above
                </p>
              </div>

              <div className="settings-info-box">
                <div className="settings-info-header">
                  <Info size={16} />
                  <h4>API URL Configuration Sources</h4>
                </div>
                <div className="settings-info-content">
                  <p>The API URL is determined by the following priority order:</p>
                  <ol>
                    <li>
                      <strong>Runtime Configuration (Docker)</strong>
                      <code>/config.json endpoint</code>
                      {runtimeConfigStatus === 'runtime' && <span className="source-badge active">✓ ACTIVE</span>}
                      {runtimeConfigStatus === 'buildtime' && <span className="source-badge">✗ NOT USED</span>}
                      {runtimeConfigStatus === 'loading' && <span className="source-badge">⏳ CHECKING...</span>}
                    </li>
                    <li>
                      <strong>Environment Variable (Build-time)</strong>
                      <code>VITE_API_URL={import.meta.env.VITE_API_URL || '<not set>'}</code>
                      {runtimeConfigStatus === 'buildtime' && import.meta.env.VITE_API_URL && <span className="source-badge active">✓ ACTIVE</span>}
                    </li>
                    <li>
                      <strong>Default Value (Fallback)</strong>
                      <code>http://localhost:3001</code>
                      {runtimeConfigStatus === 'buildtime' && !import.meta.env.VITE_API_URL && <span className="source-badge active">✓ ACTIVE</span>}
                    </li>
                  </ol>
                  
                  <div className="settings-note">
                    <strong>Important Notes:</strong>
                    <ul>
                      <li>The API URL can be set at <strong>runtime</strong> when using Docker</li>
                      <li>When building locally, create a <code>.env</code> file with <code>VITE_API_URL=http://your-api-url</code></li>
                      <li>When using Docker with runtime configuration:
                        <pre>docker run -e API_URL=http://your-api-url -p 8080:80 owui-feedback-ui</pre>
                      </li>
                      <li>For build-time configuration, use:
                        <pre>docker build --build-arg VITE_API_URL=http://your-api-url .</pre>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="settings-info-box" style={{ marginTop: '16px' }}>
                    <div className="settings-info-header">
                      <Info size={14} />
                      <h5>Docker Runtime Configuration</h5>
                    </div>
                    <div className="settings-info-content">
                      <p><strong>Runtime configuration (recommended):</strong></p>
                      <pre>docker run -e API_URL=http://localhost:3120/api -p 3121:80 owui-feedback-ui</pre>
                      <p>This uses the nginx <code>/config.json</code> endpoint to provide runtime configuration.</p>
                      
                      <p><strong>Build-time configuration (alternative):</strong></p>
                      <pre>docker build --build-arg VITE_API_URL=http://localhost:3120/api -t owui-feedback-ui .
docker run -p 3121:80 owui-feedback-ui</pre>
                      
                      <p><strong>Note:</strong> Port 80 is the nginx port inside the container. Map it to your desired host port (e.g., 3121:80).</p>
                    </div>
                  </div>
                </div>
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
          
          {activeTab === 'display' && (
            <div className="settings-tab-panel">
              <div className="settings-field">
                <label>Display Mode</label>
                <div className="settings-mode-options">
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="displayMode"
                      value="engineering"
                      checked={displayMode === 'engineering'}
                      onChange={() => handleDisplayModeChange('engineering')}
                    />
                    <div className="settings-radio-content">
                      <strong>Engineering Mode</strong>
                      <p>Full access to all technical features including prompt editing, script generation, and detailed filter controls.</p>
                    </div>
                  </label>
                  <label className="settings-radio-option">
                    <input
                      type="radio"
                      name="displayMode"
                      value="magic"
                      checked={displayMode === 'magic'}
                      onChange={() => handleDisplayModeChange('magic')}
                    />
                    <div className="settings-radio-content">
                      <strong>Magic Mode</strong>
                      <p>Simplified interface with streamlined controls. Natural language filters show only Apply button, scripts and prompts are hidden.</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="settings-status info">
                ℹ️ Display mode changes are applied immediately.
              </div>
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