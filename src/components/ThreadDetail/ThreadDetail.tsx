import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { User, Bot, Download, FileJson, FileText, File, Eye, Code, Send, Sparkles, FileSearch, MessageSquare, BarChart3 } from 'lucide-react';
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
  const { conversations, qaPairs: allQaPairs } = useFeedbackStore();
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'analytics'>('text');
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [showPromptResults, setShowPromptResults] = useState(false);
  const [promptExecutionResult, setPromptExecutionResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
    data?: any;
    error?: string;
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

  if (!conversation) {
    return (
      <div className="conversation-detail no-selection">
        <NoLogoHeader />
        <div className="empty-state">
          <p>Select a thread to view its messages</p>
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
      
      const { promptId, promptName } = JSON.parse(savedConfig);
      
      // Execute the prompt
      const result = await llmService.executePrompt({
        promptId,
        promptName,
        conversation,
        llmConfiguration
      });
      
      // Display results
      if (result.success) {
        setPromptExecutionResult({
          ...result,
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
        timestamp: new Date()
      });
      setShowPromptResults(true);
    } finally {
      setIsExecutingPrompt(false);
    }
  };

  const tabButtons = (
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
    </div>
  );

  const statsInfo = (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
      <div className="stats-info">
        <span>Q&A pairs: {conversation.qaPairCount}</span>
        <span>Rated responses: {conversation.totalRatings}</span>
        {conversation.averageRating && (
          <span>Average rating: {conversation.averageRating.toFixed(1)}/10</span>
        )}
      </div>
    </div>
  );

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
      ) : (
        <div className="analytics-container">
          <AnalyticsDashboardNoHeader 
            conversations={conversations}
            qaPairs={qaPairs}
            selectedConversationId={conversation.id}
          />
        </div>
      )}
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