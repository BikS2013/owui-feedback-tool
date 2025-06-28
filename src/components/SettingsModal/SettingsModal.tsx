import { useState, useEffect } from 'react';
import { X, Activity, ChevronRight, ChevronDown, Info, RefreshCw } from 'lucide-react';
import { storageUtils } from '../../utils/storageUtils';
import { ApiService } from '../../services/api.service';
import { useResizable } from '../../hooks/useResizable';
import { EnvironmentConfigurationService } from '../../services/environment-config.service';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Configuration tree component
function ConfigurationTree({ config }: { config: any }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['root']));
  
  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };
  
  const renderValue = (value: any, key: string, path: string): React.ReactElement => {
    if (value === null) return <span className="config-value null">null</span>;
    if (value === undefined) return <span className="config-value undefined">undefined</span>;
    
    const valueType = typeof value;
    
    if (valueType === 'string') {
      return <span className="config-value string">"{value}"</span>;
    }
    
    if (valueType === 'number') {
      return <span className="config-value number">{value}</span>;
    }
    
    if (valueType === 'boolean') {
      return <span className={`config-value boolean ${value ? 'true' : 'false'}`}>{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="config-value array">[]</span>;
      }
      
      const isExpanded = expandedKeys.has(path);
      return (
        <div>
          <span className="config-key-expand" onClick={() => toggleExpand(path)}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="config-value array">[{value.length} items]</span>
          </span>
          {isExpanded && (
            <div className="config-nested" style={{ marginLeft: '20px' }}>
              {value.map((item, index) => (
                <div key={index} className="config-item">
                  <span className="config-key">[{index}]:</span>
                  {renderValue(item, `${key}[${index}]`, `${path}[${index}]`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (valueType === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="config-value object">{'{}'}</span>;
      }
      
      const isExpanded = expandedKeys.has(path);
      return (
        <div>
          <span className="config-key-expand" onClick={() => toggleExpand(path)}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="config-value object">{'{'}...{'}'}</span>
          </span>
          {isExpanded && (
            <div className="config-nested" style={{ marginLeft: '20px' }}>
              {keys.map(k => (
                <div key={k} className="config-item">
                  <span className="config-key">{k}:</span>
                  {renderValue(value[k], k, `${path}.${k}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="config-value">{JSON.stringify(value)}</span>;
  };
  
  return (
    <div className="config-tree">
      {renderValue(config, 'root', 'root')}
    </div>
  );
}


type TabType = 'api' | 'configuration';

const SETTINGS_TAB_KEY = 'settingsModalSelectedTab';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem(SETTINGS_TAB_KEY);
    return (saved === 'api' || saved === 'configuration') ? saved : 'api';
  });
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [runtimeConfigStatus, setRuntimeConfigStatus] = useState<'loading' | 'runtime' | 'buildtime' | 'error'>('loading');
  const [environment, setEnvironment] = useState<string>('');
  const [fullConfiguration, setFullConfiguration] = useState<any>(null);
  const [configSource, setConfigSource] = useState<'runtime' | 'buildtime' | 'error'>('error');
  const [configError, setConfigError] = useState<string | null>(null);
  const [isRefreshingConfig, setIsRefreshingConfig] = useState(false);
  const [configRefreshSuccess, setConfigRefreshSuccess] = useState(false);
  
  // Use resizable hook
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth: 800,
    defaultHeight: 600,
    minWidth: 600,
    minHeight: 400,
    storageKey: 'settingsModalSize'
  });
  
  
  // Get configuration from environment variables
  const [apiUrl, setApiUrl] = useState<string>(storageUtils.getApiUrlSync());

  // Function to load configuration
  const loadConfiguration = async (showSuccess = false) => {
    try {
      setIsRefreshingConfig(true);
      setConfigRefreshSuccess(false);
      setConfigError(null);
      const configService = EnvironmentConfigurationService.getInstance();
      
      // Force reload configuration from server
      await configService.reload();
      const config = await configService.initialize();
      
      console.log('[SettingsModal] Configuration loaded:', config);
      console.log('[SettingsModal] Configuration source:', configService.getConfigSource());
      
      setApiUrl(storageUtils.getApiUrlSync());
      setEnvironment(config.environment);
      
      // Determine config source
      const source = configService.getConfigSource();
      setRuntimeConfigStatus(source);
      setConfigSource(source);
      setFullConfiguration(config);
      
      if (showSuccess) {
        setConfigRefreshSuccess(true);
        // Hide success message after 3 seconds
        setTimeout(() => setConfigRefreshSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to load environment configuration:', error);
      setRuntimeConfigStatus('error');
      setConfigSource('error');
      setConfigError(error instanceof Error ? error.message : 'Failed to load configuration');
      setFullConfiguration(null);
    } finally {
      setIsRefreshingConfig(false);
    }
  };

  // Load the actual API URL asynchronously and check if it's from runtime config
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  // Save selected tab to localStorage
  useEffect(() => {
    localStorage.setItem(SETTINGS_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      // Reset status when modal opens
      setConnectionStatus(null);
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
        
        <div className="settings-modal-body">
          <div className="settings-tabs-vertical">
            <button
              type="button"
              className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`}
              onClick={() => setActiveTab('api')}
            >
              <Activity size={16} />
              <span>API Settings</span>
            </button>
            <button
              type="button"
              className={`settings-tab ${activeTab === 'configuration' ? 'active' : ''}`}
              onClick={() => setActiveTab('configuration')}
            >
              <Info size={16} />
              <span>Configuration</span>
            </button>
          </div>
          
          <div className="settings-modal-content">
          {activeTab === 'api' && (
            <div className="settings-tab-panel">
              <div className="settings-field">
                <label>Environment</label>
                <div className="settings-input readonly">
                  {environment.charAt(0).toUpperCase() + environment.slice(1)}
                </div>
                <p className="settings-help">
                  Application is running in {environment} mode
                </p>
              </div>
              
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
                      <strong>Runtime Configuration</strong>
                      <code>/config.json endpoint</code>
                      {runtimeConfigStatus === 'runtime' && <span className="source-badge active">✓ ACTIVE</span>}
                      {(runtimeConfigStatus === 'buildtime' || runtimeConfigStatus === 'error') && <span className="source-badge">✗ NOT USED</span>}
                      {runtimeConfigStatus === 'loading' && <span className="source-badge">⏳ CHECKING...</span>}
                    </li>
                    <li>
                      <strong>Environment Variable (Build-time)</strong>
                      <code>VITE_API_URL={import.meta.env.VITE_API_URL || '<not set>'}</code>
                      {runtimeConfigStatus === 'buildtime' && <span className="source-badge active">✓ ACTIVE</span>}
                      {(runtimeConfigStatus === 'runtime' || runtimeConfigStatus === 'error') && <span className="source-badge">✗ NOT USED</span>}
                    </li>
                    <li>
                      <strong>Default Configuration</strong>
                      <code>Environment-specific defaults</code>
                      {runtimeConfigStatus === 'error' && <span className="source-badge active">⚠️ FALLBACK</span>}
                      {(runtimeConfigStatus === 'runtime' || runtimeConfigStatus === 'buildtime') && <span className="source-badge">✗ NOT USED</span>}
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

          {activeTab === 'configuration' && (
            <div className="settings-tab-panel">
              <div className="settings-field">
                <label>Configuration Source</label>
                <div className={`settings-status ${configSource}`}>
                  {configSource === 'runtime' && '🌐 Runtime Configuration (from config.json)'}
                  {configSource === 'buildtime' && '🔨 Build-time Configuration (from .env)'}
                  {configSource === 'error' && '❌ Configuration Error'}
                </div>
              </div>
              
              <button
                type="button"
                className="settings-button primary"
                onClick={() => loadConfiguration(true)}
                disabled={isRefreshingConfig}
                style={{ marginBottom: '20px' }}
              >
                <RefreshCw size={16} className={isRefreshingConfig ? 'spin' : ''} />
                {isRefreshingConfig ? 'Refreshing...' : 'Refresh Configuration'}
              </button>
              
              {configRefreshSuccess && (
                <div className="settings-status success" style={{ marginBottom: '20px' }}>
                  ✓ Configuration refreshed successfully
                </div>
              )}
              
              {configError && (
                <div className="settings-status error" style={{ marginBottom: '20px' }}>
                  ✗ {configError}
                </div>
              )}
              
              {environment && (
                <div className="settings-field">
                  <label>Environment</label>
                  <div className="settings-status info">
                    {environment.charAt(0).toUpperCase() + environment.slice(1)}
                  </div>
                </div>
              )}
              
              {fullConfiguration?.features && (
                <div className="settings-field">
                  <label>Feature Flags</label>
                  <div className="settings-info-box">
                    <div className="settings-info-content">
                      <table className="feature-flags-table">
                        <tbody>
                          <tr>
                            <td>Show Documents</td>
                            <td>
                              {fullConfiguration.features.show_documents === undefined ? (
                                <span className="config-value undefined">undefined</span>
                              ) : (
                                <span className={`config-value boolean ${fullConfiguration.features.show_documents ? 'true' : 'false'}`}>
                                  {fullConfiguration.features.show_documents ? '✓ Enabled' : '✗ Disabled'}
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Show Runs</td>
                            <td>
                              {fullConfiguration.features.show_runs === undefined ? (
                                <span className="config-value undefined">undefined</span>
                              ) : (
                                <span className={`config-value boolean ${fullConfiguration.features.show_runs ? 'true' : 'false'}`}>
                                  {fullConfiguration.features.show_runs ? '✓ Enabled' : '✗ Disabled'}
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Show Checkpoints</td>
                            <td>
                              {fullConfiguration.features.show_checkpoints === undefined ? (
                                <span className="config-value undefined">undefined</span>
                              ) : (
                                <span className={`config-value boolean ${fullConfiguration.features.show_checkpoints ? 'true' : 'false'}`}>
                                  {fullConfiguration.features.show_checkpoints ? '✓ Enabled' : '✗ Disabled'}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="settings-field">
                <label>Full Configuration</label>
                <div className="configuration-tree">
                  {fullConfiguration ? (
                    <ConfigurationTree config={fullConfiguration} />
                  ) : (
                    <div className="settings-status">Loading configuration...</div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
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