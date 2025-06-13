import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { User, Bot, Download, FileJson, FileText, File, Eye, Code, Send, Sparkles, FileSearch, MessageSquare, BarChart3, Files } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { NoLogoHeader } from '../NoLogoHeader/NoLogoHeader';
import { PromptSelectorModal } from '../PromptSelectorModal/PromptSelectorModal';
import { PromptResultsModal } from '../PromptResultsModal/PromptResultsModal';
import { ApiService } from '../../services/api.service';
import { llmService } from '../../services/llm.service';
import { AnalyticsDashboardNoHeader } from '../AnalyticsDashboard/AnalyticsDashboardNoHeader';
import { useFeedbackStore } from '../../store/feedbackStore';
import { 
  downloadAsJSON, 
  downloadAsMarkdown,
  downloadAsDocx,
  downloadAsPDF,
  formatConversationForDownload
} from '../../utils/downloadUtils';
import './ThreadDetail.css';

interface ThreadDetailProps {
  conversation: Conversation | null;
  qaPairs: QAPair[];
}

export function ThreadDetail({ conversation, qaPairs }: ThreadDetailProps) {
  const { conversations, qaPairs: allQaPairs, currentAgent } = useFeedbackStore();
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'analytics' | 'documents'>('text');
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [showPromptResults, setShowPromptResults] = useState(false);
  const [promptExecutionResult, setPromptExecutionResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
    response?: string;
    error?: string;
    duration?: number;
    promptName?: string;
    llmConfiguration?: any;
  } | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch documents when Documents tab is active and conversation changes
  useEffect(() => {
    if (activeTab === 'documents' && conversation && currentAgent) {
      fetchDocuments();
    }
  }, [activeTab, conversation?.id]);

  const fetchDocuments = async () => {
    if (!conversation || !currentAgent) return;
    
    setIsLoadingDocuments(true);
    setDocumentsError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(
        `${apiUrl}/agent/thread/${conversation.id}/documents?agentName=${encodeURIComponent(currentAgent)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch documents: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocumentsError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Setup header elements - reusable for both empty and populated states
  const tabButtons = conversation ? (
    <div className="tab-buttons-header">
      <button
        type="button"
        className={`tab-button-header ${activeTab === 'text' ? 'active' : ''}`}
        onClick={() => setActiveTab('text')}
      >
        {MessageSquare && <MessageSquare size={16} />}
        <span>Text</span>
      </button>
      <button
        type="button"
        className={`tab-button-header ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => setActiveTab('analytics')}
      >
        {BarChart3 && <BarChart3 size={16} />}
        <span>Analytics</span>
      </button>
      <button
        type="button"
        className={`tab-button-header ${activeTab === 'documents' ? 'active' : ''}`}
        onClick={() => setActiveTab('documents')}
      >
        {Files && <Files size={16} />}
        <span>Documents</span>
      </button>
    </div>
  ) : (
    <div className="tab-buttons-header">
      <button
        type="button"
        className="tab-button-header active"
        disabled
      >
        {MessageSquare && <MessageSquare size={16} />}
        <span>Text</span>
      </button>
      <button
        type="button"
        className="tab-button-header"
        disabled
      >
        {BarChart3 && <BarChart3 size={16} />}
        <span>Analytics</span>
      </button>
      <button
        type="button"
        className="tab-button-header"
        disabled
      >
        {Files && <Files size={16} />}
        <span>Documents</span>
      </button>
    </div>
  );

  const statsInfo = conversation ? (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
      <div className="stats-info">
        <span>Q&A pairs: {conversation.qaPairCount}</span>
        <span>Rated responses: {conversation.totalRatings}</span>
        {conversation.averageRating && (
          <span>Average rating: {conversation.averageRating.toFixed(1)}/10</span>
        )}
      </div>
    </div>
  ) : (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
      <div className="stats-info">
        <span>No thread selected</span>
      </div>
    </div>
  );

  if (!conversation) {
    const noDataTitle = conversations.length === 0 ? "No Threads Available" : "No Thread Selected";
    const noDataMessage = conversations.length === 0 ? "No threads loaded" : "No thread selected";
    
    const emptyHeaderActions = (
      <div className="header-actions">
        <button
          type="button"
          className="prompt-selector-button"
          onClick={() => setShowPromptSelector(true)}
          title="Select and execute prompt"
        >
          <FileSearch size={16} />
        </button>
        <button
          type="button"
          className="llm-execute-button"
          disabled
          title="Select a thread first"
        >
          <Sparkles size={16} />
        </button>
        <button
          type="button"
          className="export-backend-button"
          disabled
          title="Select a thread first"
        >
          <Send size={16} />
        </button>
        <button 
          className="view-toggle-button"
          disabled
          title="Select a thread first"
        >
          <Code size={16} />
        </button>
        <div className="download-container">
          <button 
            className="download-button"
            disabled
            title="Select a thread first"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    );

    return (
      <div className="conversation-detail thread-detail">
        <NoLogoHeader
          title={<h2>{noDataTitle}</h2>}
          topRightControls={emptyHeaderActions}
          subtitle={tabButtons}
          bottomRightControls={
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <div className="stats-info">
                <span>{noDataMessage}</span>
              </div>
            </div>
          }
          className="conversation-header"
          heightAdjustment={2}
        />
        <div className="empty-state">
          <p>{conversations.length === 0 ? "Connect to an agent to load threads" : "Select a thread to view its messages"}</p>
        </div>
      </div>
    );
  }

  const handleDownload = async (format: 'json' | 'markdown' | 'docx' | 'pdf') => {
    const data = await formatConversationForDownload(conversation, qaPairs);
    const filename = `thread-${conversation.id.slice(0, 8)}`;
    
    switch (format) {
      case 'json':
        downloadAsJSON(data.jsonData, filename);
        break;
      case 'markdown':
        downloadAsMarkdown(data.markdownContent, filename);
        break;
      case 'docx':
        if (data.docxBlob) {
          downloadAsDocx(data.docxBlob, filename);
        }
        break;
      case 'pdf':
        if (data.pdfBlob) {
          downloadAsPDF(data.pdfBlob, filename);
        }
        break;
    }
    
    setShowDownloadMenu(false);
  };

  const handleExportToBackend = async () => {
    if (!conversation) return;
    
    console.log('Export button clicked, current state:', isExporting);
    
    if (isExporting) {
      console.log('Already exporting, ignoring click');
      return;
    }
    
    setIsExporting(true);
    console.log('Starting export...');
    
    try {
      const apiService = new ApiService();
      
      // Export the conversation
      console.log('Exporting conversation to backend...');
      await apiService.exportConversation(conversation);
      
      // Export all related Q&A pairs
      const conversationQaPairs = allQaPairs.filter(qa => qa.conversationId === conversation.id);
      for (const qaPair of conversationQaPairs) {
        await apiService.exportQAPair(qaPair);
      }
      
      console.log('Export successful');
      alert(`Successfully exported conversation and ${conversationQaPairs.length} Q&A pairs to backend`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export to backend. Please check the console for details.');
    } finally {
      setIsExporting(false);
      console.log('Export finished, isExporting set to false');
    }
  };

  const handleExecutePrompt = async () => {
    if (!conversation) return;
    
    setIsExecutingPrompt(true);
    
    try {
      // Get the selected LLM configuration from localStorage
      const llmConfiguration = llmService.getSelectedConfiguration();
      if (!llmConfiguration) {
        alert('Please select an LLM configuration in Settings first.');
        setIsExecutingPrompt(false);
        return;
      }
      
      // Get the saved prompt configuration from localStorage
      const savedConfig = localStorage.getItem('promptSelectorConfiguration');
      if (!savedConfig) {
        alert('Please select a prompt first.');
        setShowPromptSelector(true);
        setIsExecutingPrompt(false);
        return;
      }
      
      const promptConfig = JSON.parse(savedConfig);
      if (!promptConfig.selectedFile || !promptConfig.promptContent) {
        alert('Please select a prompt template in the Prompt Selector first.');
        setShowPromptSelector(true);
        setIsExecutingPrompt(false);
        return;
      }
      
      console.log('Executing prompt with saved configuration:', {
        llmConfiguration,
        promptFile: promptConfig.selectedFile,
        parameters: promptConfig.parameters
      });
      
      // Build parameter values based on the saved configuration
      const parameterValues: Record<string, string> = {};
      
      if (promptConfig.parameters) {
        for (const param of promptConfig.parameters) {
          switch (param.source) {
            case 'conversation':
              parameterValues[param.name] = JSON.stringify(conversation);
              break;
            case 'qa':
              parameterValues[param.name] = JSON.stringify(qaPairs);
              break;
            case 'current-date':
              parameterValues[param.name] = new Date().toLocaleDateString();
              break;
            case 'current-datetime':
              parameterValues[param.name] = new Date().toLocaleString();
              break;
            case 'custom-text':
              parameterValues[param.name] = param.customValue || '';
              break;
            default:
              parameterValues[param.name] = '';
          }
        }
      }
      
      console.log('Parameter values:', parameterValues);
      
      const startTime = Date.now();
      
      // Use the parameterized execution method
      const response = await llmService.executePromptWithParameters(
        llmConfiguration,
        promptConfig.promptContent,
        parameterValues
      );
      
      console.log('LLM Response:', response);
      
      const duration = Date.now() - startTime;
      
      // Extract prompt name from file path
      const promptName = promptConfig.selectedFile.split('/').pop() || 'Unknown Prompt';
      
      // Display results
      if (response.success) {
        setPromptExecutionResult({
          success: true,
          message: 'Prompt executed successfully!',
          response: response.result,
          timestamp: new Date(),
          duration,
          promptName,
          llmConfiguration
        });
        setShowPromptResults(true);
      } else {
        setPromptExecutionResult({
          success: false,
          message: response.error || 'Execution failed',
          error: response.error,
          timestamp: new Date(),
          duration,
          promptName,
          llmConfiguration
        });
        setShowPromptResults(true);
      }
    } catch (error) {
      console.error('Error executing prompt:', error);
      setPromptExecutionResult({
        success: false,
        message: 'Failed to execute prompt',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptName: promptConfig?.selectedFile?.split('/').pop() || 'Unknown Prompt',
        llmConfiguration
      });
      setShowPromptResults(true);
    } finally {
      setIsExecutingPrompt(false);
    }
  };

  const headerActions = (
    <div className="header-actions">
      <button
        type="button"
        className="prompt-selector-button"
        onClick={() => setShowPromptSelector(true)}
        title="Select and execute prompt"
      >
        <FileSearch size={16} />
      </button>
      <button
        type="button"
        className="llm-execute-button"
        onClick={handleExecutePrompt}
        disabled={isExecutingPrompt}
        title={isExecutingPrompt ? "Executing prompt..." : "Execute LLM prompt"}
      >
        {isExecutingPrompt ? (
          <div className="button-spinner" />
        ) : (
          <Sparkles size={16} />
        )}
      </button>
      <button
        type="button"
        className="export-backend-button"
        onClick={handleExportToBackend}
        disabled={isExporting}
        title={isExporting ? "Exporting..." : "Export to backend"}
      >
        {isExporting ? (
          <div className="button-spinner" />
        ) : (
          <Send size={16} />
        )}
      </button>
      <button 
        className="view-toggle-button"
        onClick={() => setShowRawJson(!showRawJson)}
        title="Toggle raw JSON view"
      >
        {showRawJson ? <Eye size={16} /> : <Code size={16} />}
      </button>
      <div className="download-container" ref={downloadRef}>
        <button 
          className="download-button"
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          title="Download conversation"
        >
          <Download size={16} />
        </button>
        
        {showDownloadMenu && (
          <div className="download-menu">
            <button onClick={() => handleDownload('json')}>
              <FileJson size={14} />
              <span>JSON</span>
            </button>
            <button onClick={() => handleDownload('markdown')}>
              <FileText size={14} />
              <span>Markdown</span>
            </button>
            <button onClick={() => handleDownload('docx')}>
              <File size={14} />
              <span>Word</span>
            </button>
            <button onClick={() => handleDownload('pdf')}>
              <FileText size={14} />
              <span>PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="conversation-detail thread-detail">
      <NoLogoHeader
        title={<h2>{conversation.title}</h2>}
        topRightControls={headerActions}
        subtitle={tabButtons}
        bottomRightControls={statsInfo}
        className="conversation-header"
        heightAdjustment={2}
      />

      {activeTab === 'text' ? (
        showRawJson ? (
          <div className="raw-json-container">
            <pre className="raw-json-content">
              {JSON.stringify(conversation, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="conversation-content">
            <div className="messages-container">
              {conversation.messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-header">
                    <div className="message-icon">
                      {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <span className="message-role">
                      {message.role === 'user' ? 'Human' : 'Assistant'}
                    </span>
                    {message.model && (
                      <span className="message-model">{message.model}</span>
                    )}
                    <span className="message-time">
                      {format(new Date(message.timestamp), 'h:mm a')}
                    </span>
                  </div>
                  
                  <div className="message-content">
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : activeTab === 'analytics' ? (
        <div className="analytics-container">
          <AnalyticsDashboardNoHeader 
            conversations={conversations}
            qaPairs={qaPairs}
            selectedConversationId={conversation.id}
          />
        </div>
      ) : activeTab === 'documents' ? (
        <div className="documents-container">
          {isLoadingDocuments ? (
            <div className="documents-loading">
              <div className="spinner" />
              <p>Loading documents...</p>
            </div>
          ) : documentsError ? (
            <div className="documents-error">
              <p>Error loading documents: {documentsError}</p>
              <button onClick={fetchDocuments}>Retry</button>
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="documents-empty">
              <Files size={48} className="empty-icon" />
              <p>No documents found for this conversation</p>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((doc, index) => (
                <div key={doc.id || index} className="document-item">
                  <div className="document-header">
                    <div className="document-icon">
                      <FileText size={20} />
                    </div>
                    <div className="document-meta">
                      <h4 className="document-title">{doc.metadata?.title || `Document ${index + 1}`}</h4>
                      {doc.metadata?.url && (
                        <a 
                          href={doc.metadata.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-url"
                        >
                          {doc.metadata.url}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="document-content">
                    <pre>{doc.page_content || JSON.stringify(doc, null, 2)}</pre>
                  </div>
                  {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                    <div className="document-metadata">
                      <details>
                        <summary>Metadata</summary>
                        <pre>{JSON.stringify(doc.metadata, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <PromptSelectorModal 
        isOpen={showPromptSelector} 
        onClose={() => setShowPromptSelector(false)} 
        conversation={conversation}
      />
      <PromptResultsModal
        isOpen={showPromptResults}
        onClose={() => setShowPromptResults(false)}
        result={promptExecutionResult}
      />
    </div>
  );
}