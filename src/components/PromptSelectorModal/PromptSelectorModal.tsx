import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { userPromptsService, UserPrompt } from '../../services/userPrompts.service';
import { parsePromptParameters } from '../../utils/promptParser';
import { llmService } from '../../services/llm.service';
import { LLMConfiguration } from '../../types/llm';
import { Conversation } from '../../types/conversation';
import { ResizableModal } from '../ResizableModal/ResizableModal';
import './PromptSelectorModal.css';

interface PromptSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: Conversation;
  qaPair?: any; // Add proper type when Q&A modal is implemented
}


type ParameterSource = 'conversation' | 'qa' | 'current-date' | 'current-datetime' | 'custom-text';

interface ParameterConfig {
  name: string;
  source: ParameterSource;
  customValue?: string;
}

interface PromptConfiguration {
  selectedFile: string;
  promptContent: string;
  parameters: ParameterConfig[];
}

const STORAGE_KEY = 'promptSelectorConfiguration';

export const PromptSelectorModal: React.FC<PromptSelectorModalProps> = ({ isOpen, onClose, conversation, qaPair }) => {
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [promptContent, setPromptContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [parameterConfigs, setParameterConfigs] = useState<ParameterConfig[]>([]);
  
  // LLM states
  const [llmConfigurations, setLlmConfigurations] = useState<LLMConfiguration[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [defaultLLM, setDefaultLLM] = useState<string | null>(null);
  const [isLoadingLLM, setIsLoadingLLM] = useState(false);
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);
  const [testPrompt, setTestPrompt] = useState<string>('Hello! Please respond with a brief greeting.');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);
  
  // Parse parameters from prompt content
  const parameters = useMemo(() => parsePromptParameters(promptContent), [promptContent]);

  useEffect(() => {
    if (isOpen) {
      loadUserPrompts();
      loadSavedConfiguration();
      loadLLMConfigurations();
    }
  }, [isOpen]);
  
  // Update parameter configs when parameters change
  useEffect(() => {
    setParameterConfigs(prevConfigs => {
      // Keep existing configs for parameters that still exist
      const newConfigs: ParameterConfig[] = parameters.map(param => {
        const existingConfig = prevConfigs.find(c => c.name === param);
        return existingConfig || {
          name: param,
          source: 'conversation' as ParameterSource,
          customValue: ''
        };
      });
      return newConfigs;
    });
  }, [parameters]);
  
  // Save configuration to local storage whenever it changes
  useEffect(() => {
    if (selectedPromptId || promptContent || parameterConfigs.length > 0) {
      const config: PromptConfiguration = {
        selectedFile: selectedPromptId,
        promptContent,
        parameters: parameterConfigs
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save prompt configuration:', error);
      }
    }
  }, [selectedPromptId, promptContent, parameterConfigs]);

  const loadSavedConfiguration = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config: PromptConfiguration = JSON.parse(saved);
        if (config.selectedFile) {
          setSelectedPromptId(config.selectedFile);
          // Load the prompt content if it exists
          handlePromptSelect(config.selectedFile);
        }
        if (config.parameters) {
          setParameterConfigs(config.parameters);
        }
      }
    } catch (error) {
      console.error('Failed to load saved configuration:', error);
    }
  };
  
  const updateParameterConfig = (paramName: string, field: 'source' | 'customValue', value: string) => {
    setParameterConfigs(configs => 
      configs.map(config => 
        config.name === paramName 
          ? { ...config, [field]: value }
          : config
      )
    );
  };
  
  const loadLLMConfigurations = async () => {
    setIsLoadingLLM(true);
    try {
      const response = await llmService.getConfigurations();
      const configs = response.configurations;
      setLlmConfigurations(configs);
      
      // Set default from response
      if (response.defaultConfiguration) {
        setDefaultLLM(response.defaultConfiguration);
      }
      
      // Set selected from localStorage or use default
      const savedSelection = llmService.getSelectedConfiguration();
      if (savedSelection && configs.some(c => c.name === savedSelection)) {
        setSelectedLLM(savedSelection);
      } else if (response.defaultConfiguration) {
        setSelectedLLM(response.defaultConfiguration);
      }
    } catch (error) {
      console.error('Failed to load LLM configurations:', error);
      setLlmConfigurations([]);
      // Show error to user
      if (error instanceof Error && error.message.includes('fetch')) {
        setError('Unable to connect to backend server. Please ensure the backend is running on port 3001.');
      } else {
        setError('Failed to load LLM configurations. Please check the backend server.');
      }
    } finally {
      setIsLoadingLLM(false);
    }
  };
  
  const handleLLMSelection = (configName: string) => {
    setSelectedLLM(configName);
    llmService.setSelectedConfiguration(configName);
    setLlmTestResult(null);
  };
  
  const handleTestLLM = async () => {
    if (!selectedLLM) return;
    
    setIsTestingLLM(true);
    setLlmTestResult(null);
    
    try {
      const result = await llmService.testConfiguration(selectedLLM, testPrompt);
      
      if (result.success) {
        setLlmTestResult({
          success: true,
          message: `Success! Response received${result.duration ? ` in ${result.duration}ms` : ''}`,
          response: result.response
        });
      } else {
        setLlmTestResult({
          success: false,
          message: result.error || 'Test failed'
        });
      }
    } catch (error) {
      setLlmTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test LLM'
      });
    } finally {
      setIsTestingLLM(false);
    }
  };

  const buildParameterValues = () => {
    const values: Record<string, string> = {};
    
    parameterConfigs.forEach(config => {
      switch (config.source) {
        case 'conversation':
          if (conversation) {
            // Use the entire conversation as JSON
            values[config.name] = JSON.stringify(conversation, null, 2);
          }
          break;
        case 'qa':
          if (qaPair) {
            // Use the Q&A pair data
            values[config.name] = JSON.stringify(qaPair, null, 2);
          }
          break;
        case 'current-date':
          values[config.name] = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
          break;
        case 'current-datetime':
          values[config.name] = new Date().toLocaleString('en-CA', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(',', '');
          break;
        case 'custom-text':
          values[config.name] = config.customValue || '';
          break;
      }
    });
    
    return values;
  };

  const handleExecutePrompt = async () => {
    if (!selectedLLM || !promptContent) {
      alert('Please select a model and load a prompt first.');
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const parameterValues = buildParameterValues();
      
      // Call the enhanced execute prompt endpoint
      const response = await llmService.executePromptWithParameters(
        selectedLLM,
        promptContent,
        parameterValues
      );

      if (response.success) {
        setExecutionResult({
          success: true,
          message: 'Prompt executed successfully!',
          response: response.result
        });
      } else {
        setExecutionResult({
          success: false,
          message: response.error || 'Execution failed'
        });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute prompt'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const loadUserPrompts = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Loading user prompts from backend...');
      
      const prompts = await userPromptsService.listPrompts();
      console.log('Loaded user prompts:', prompts);
      
      // Sort prompts alphabetically by name
      const sortedPrompts = [...prompts].sort((a, b) => a.name.localeCompare(b.name));
      
      setUserPrompts(sortedPrompts);
    } catch (err) {
      console.error('Error loading user prompts:', err);
      setError('Failed to load user prompts: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSelect = async (promptId: string) => {
    setSelectedPromptId(promptId);
    setIsLoading(true);
    setError('');
    try {
      const prompt = await userPromptsService.getPrompt(promptId);
      if (prompt && prompt.content) {
        setPromptContent(prompt.content);
      } else {
        setError('Failed to load prompt content: Not Found');
        setPromptContent('');
      }
    } catch (err) {
      setError('Failed to load prompt content: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setPromptContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const headerContent = (
    <>
      <h2>Select Model</h2>
      <div className="model-controls">
        <select 
          className="llm-select"
          value={selectedLLM || ''}
          onChange={(e) => handleLLMSelection(e.target.value)}
          disabled={llmConfigurations.length === 0 || isLoadingLLM}
          title={llmConfigurations.length === 0 && !isLoadingLLM ? 'Backend server not running. Start the backend on port 3001.' : ''}
        >
          {isLoadingLLM ? (
            <option value="">Loading configurations...</option>
          ) : llmConfigurations.length === 0 ? (
            <option value="">No LLM configurations (check backend)</option>
          ) : (
            <>
              <option value="">-- Select a model --</option>
              {llmConfigurations.map((config) => (
                <option key={config.name} value={config.name}>
                  {config.name} - {config.provider}
                  {config.name === defaultLLM && ' (default)'}
                  {!config.enabled && ' (disabled)'}
                </option>
              ))}
            </>
          )}
        </select>
        <input
          type="text"
          className="test-prompt-input"
          placeholder="Test prompt"
          value={testPrompt}
          onChange={(e) => setTestPrompt(e.target.value)}
        />
        <button
          type="button"
          className="llm-test-button icon-only"
          onClick={handleTestLLM}
          disabled={!selectedLLM || isTestingLLM}
          title={isTestingLLM ? 'Testing...' : 'Test LLM'}
        >
          {isTestingLLM ? (
            <div className="spinner" />
          ) : (
            <Zap size={16} />
          )}
        </button>
      </div>
    </>
  );

  const footerContent = (
    <button
      type="button"
      className="execute-prompt-button"
      onClick={handleExecutePrompt}
      disabled={!selectedLLM || !promptContent || isExecuting}
    >
      {isExecuting ? (
        <>
          <div className="spinner" />
          <span>Executing...</span>
        </>
      ) : (
        <>
          <Sparkles size={16} />
          <span>Execute Prompt</span>
        </>
      )}
    </button>
  );

  return (
    <ResizableModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="prompt-selector-modal"
      defaultWidth={600}
      defaultHeight={600}
      minWidth={400}
      minHeight={400}
      storageKey="promptSelectorModalSize"
      headerContent={headerContent}
      footerContent={footerContent}
    >
        
        <div className="modal-content">
          <div className="modal-content-layout">
            <div className="prompt-area">
              {error && <div className="error-message">{error}</div>}
              {llmConfigurations.length === 0 && !isLoadingLLM && (
                <div className="info-message" style={{ marginBottom: '16px' }}>
                  <strong>Backend not connected:</strong> Please ensure the backend server is running on port 3001. 
                  Run <code>npm run backend:dev</code> in the backend folder to start it.
                </div>
              )}
              
              {llmTestResult && (
                <div className="llm-test-result-container">
                  <div className={`llm-test-status ${llmTestResult.success ? 'success' : 'error'}`}>
                    <div className="llm-test-header">
                      <span>{llmTestResult.success ? '✓' : '✗'} {llmTestResult.message}</span>
                      <button 
                        className="llm-test-close"
                        onClick={() => setLlmTestResult(null)}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                    {llmTestResult.response && (
                      <div className="llm-test-response">
                        {llmTestResult.response}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="prompt-content-section">
                <div className="prompt-header-row">
                  <label className="prompt-select-label">Select Prompt</label>
                  <select 
                    value={selectedPromptId} 
                    onChange={(e) => handlePromptSelect(e.target.value)}
                    disabled={isLoading}
                    className="prompt-file-dropdown"
                  >
                    <option value="">-- Select a prompt file --</option>
                    {userPrompts.map(prompt => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  id="prompt-content"
                  className="prompt-textarea"
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  placeholder={isLoading ? "Loading..." : "Select a file to view its content"}
                  disabled={isLoading}
                />
              </div>
              
              {/* Execution Results */}
              {executionResult && (
                <div className="execution-result-container">
                  <div className={`execution-result ${executionResult.success ? 'success' : 'error'}`}>
                    <div className="execution-result-header">
                      <span>{executionResult.success ? '✓' : '✗'} {executionResult.message}</span>
                      <button 
                        className="execution-result-close"
                        onClick={() => setExecutionResult(null)}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                    {executionResult.response && (
                      <div className="execution-result-response">
                        <pre>{executionResult.response}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {parameters.length > 0 && (
              <div className="parameters-section">
                <h3>Parameters Configuration:</h3>
                <div className="parameters-config-list">
                  {parameterConfigs.map((config) => (
                    <div key={config.name} className="parameter-config-item">
                      <span className="parameter-name">{config.name}:</span>
                      <select
                        className="parameter-source-select"
                        value={config.source}
                        onChange={(e) => updateParameterConfig(config.name, 'source', e.target.value)}
                      >
                        <option value="conversation">From Conversation</option>
                        <option value="qa">From Q&A</option>
                        <option value="current-date">Current Date (YYYY/MM/DD)</option>
                        <option value="current-datetime">Current DateTime (YYYY/MM/DD HH:mm:ss)</option>
                        <option value="custom-text">Custom Text</option>
                      </select>
                      {config.source === 'custom-text' && (
                        <input
                          type="text"
                          className="parameter-custom-input"
                          placeholder="Enter custom value"
                          value={config.customValue || ''}
                          onChange={(e) => updateParameterConfig(config.name, 'customValue', e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="parameters-info">
                  Configure how each parameter should be filled. Settings are saved automatically.
                </p>
              </div>
            )}
          </div>
        </div>
    </ResizableModal>
  );
};