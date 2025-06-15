import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { 
  Download, 
  FileJson, 
  FileText, 
  File, 
  Code, 
  Eye, 
  Send, 
  Sparkles, 
  FileSearch, 
  MessageSquare, 
  BarChart3,
  Files 
} from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { Message } from '../../types/feedback';
import { NoLogoHeader } from '../NoLogoHeader/NoLogoHeader';
import { PromptSelectorModal } from '../PromptSelectorModal/PromptSelectorModal';
import { PromptResultsModal } from '../PromptResultsModal/PromptResultsModal';
import { LangGraphChatView } from '../LangGraphChatView/LangGraphChatView';
import { OWUIChatView } from '../OWUIChatView/OWUIChatView';
import { CollapsibleJSON } from '../CollapsibleJSON';
import { 
  downloadAsJSON, 
  downloadAsMarkdown,
  downloadAsDocx,
  downloadAsPDF,
  formatConversationForDownload, 
  formatQAPairForDownload 
} from '../../utils/downloadUtils';
import { ApiService } from '../../services/api.service';
import { llmService } from '../../services/llm.service';
import { AnalyticsDashboardNoHeader } from '../AnalyticsDashboard/AnalyticsDashboardNoHeader';
import { useFeedbackStore } from '../../store/feedbackStore';
import './ConversationDetail.css';

interface ConversationDetailProps {
  conversation: Conversation | null;
  qaPairs: QAPair[];
}

export function ConversationDetail({ conversation, qaPairs }: ConversationDetailProps) {
  const { conversations, qaPairs: allQaPairs, dataSource, currentAgent, langGraphThreads } = useFeedbackStore();
  
  // Get the current LangGraph thread if in agent mode
  const currentThread = dataSource === 'agent' && conversation 
    ? langGraphThreads.find(thread => thread.thread_id === conversation.id)
    : null;
  
  // Debug logging
  useEffect(() => {
    console.log('ConversationDetail - dataSource:', dataSource);
    console.log('ConversationDetail - currentAgent:', currentAgent);
    console.log('ConversationDetail - currentThread:', currentThread);
  }, [dataSource, currentAgent, currentThread]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [qaDownloadMenus, setQaDownloadMenus] = useState<{ [key: string]: boolean }>({});
  const [showSourceView, setShowSourceView] = useState<{
    text: boolean;
    analytics: boolean;
    documents: boolean;
  }>({
    text: false,
    analytics: false,
    documents: false
  });
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExecutingPrompt, setIsExecutingPrompt] = useState(false);
  const [showPromptResults, setShowPromptResults] = useState(false);
  const [promptExecutionResult, setPromptExecutionResult] = useState<{
    success: boolean;
    message: string;
    response?: string;
    error?: string;
    timestamp?: Date;
    duration?: number;
    promptName?: string;
    llmConfiguration?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'analytics' | 'documents'>('text');
  const [documents, setDocuments] = useState<any[] | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (downloadRef.current && !downloadRef.current.contains(target)) {
        setShowDownloadMenu(false);
        setQaDownloadMenus({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch documents when Documents tab is active and conversation changes
  useEffect(() => {
    if (activeTab === 'documents' && conversation && dataSource === 'agent' && currentAgent) {
      console.log('📄 [ConversationDetail] Fetching documents...');
      fetchDocuments();
    }
  }, [activeTab, conversation?.id]);

  const fetchDocuments = async () => {
    if (!conversation || dataSource !== 'agent' || !currentAgent) return;
    
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

  const handleDownload = async (format: 'json' | 'markdown' | 'docx' | 'pdf') => {
    if (!conversation) return;
    
    const data = await formatConversationForDownload(conversation, qaPairs);
    const filename = `${dataSource === 'agent' ? 'thread' : 'conversation'}-${conversation.id.slice(0, 8)}`;
    
    switch (format) {
      case 'json':
        downloadAsJSON(data.jsonData, filename);
        break;
      case 'markdown':
        downloadAsMarkdown(data.markdownContent, filename);
        break;
      case 'docx':
        if (data.docxBlob) {
          await downloadAsDocx(data.docxBlob, filename);
        }
        break;
      case 'pdf':
        if (data.pdfBlob) {
          await downloadAsPDF(data.pdfBlob, filename);
        }
        break;
    }
    
    setShowDownloadMenu(false);
  };

  // Early setup for header elements when no conversation
  if (!conversation) {
    const noDataTitle = dataSource === 'agent' 
      ? (conversations.length === 0 ? "No Threads Available" : "No Thread Selected")
      : (conversations.length === 0 ? "No Conversations Available" : "No Conversation Selected");
    const noDataMessage = dataSource === 'agent'
      ? (conversations.length === 0 ? "No threads loaded" : "No thread selected")
      : (conversations.length === 0 ? "No conversations loaded" : "No conversation selected");
    const emptyTabButtons = (
      <div className="tab-buttons-header">
        <button
          type="button"
          className="tab-button-header active"
          disabled
        >
          {MessageSquare && <MessageSquare size={16} />}
          <span>Chat</span>
        </button>
        {dataSource === 'agent' && (
          <button
            type="button"
            className="tab-button-header"
            disabled
          >
            {Files && <Files size={16} />}
            <span>Documents</span>
          </button>
        )}
        <button
          type="button"
          className="tab-button-header"
          disabled
        >
          {BarChart3 && <BarChart3 size={16} />}
          <span>Ratings</span>
        </button>
      </div>
    );

    const emptyStatsInfo = (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
        <div className="stats-info">
          <span>{noDataMessage}</span>
        </div>
      </div>
    );

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
          title="Select a conversation first"
        >
          <Sparkles size={16} />
        </button>
        <button
          type="button"
          className="export-backend-button"
          disabled
          title="Select a conversation first"
        >
          <Send size={16} />
        </button>
        <button 
          className="view-toggle-button"
          disabled
          title="Select a conversation first"
        >
          <Code size={16} />
        </button>
        <div className="download-container">
          <button 
            className="download-button"
            disabled
            title="Select a conversation first"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    );

    return (
      <div className="conversation-detail">
        <NoLogoHeader
          title={<h2>{noDataTitle}</h2>}
          topRightControls={emptyHeaderActions}
          subtitle={emptyTabButtons}
          bottomRightControls={emptyStatsInfo}
          className="conversation-header"
          heightAdjustment={2}
        />
        <div className="empty-state">
          <p>{dataSource === 'agent' 
            ? (conversations.length === 0 ? "Connect to an agent to load threads" : "Select a thread to view its messages")
            : (conversations.length === 0 ? "Upload a JSON file to get started" : "Select a conversation to view details")}</p>
        </div>
      </div>
    );
  }

  const getRatingInfo = (message: Message) => {
    const qaPair = qaPairs.find(qa => qa.answer.id === message.id);
    if (!qaPair) return null;
    
    return {
      rating: qaPair.rating,
      sentiment: qaPair.sentiment,
      comment: qaPair.comment
    };
  };


  const handleExportToBackend = async () => {
    if (!conversation) return;
    
    if (isExporting) {
      return;
    }
    
    setIsExporting(true);
    
    try {
      if (dataSource === 'agent') {
        // For agent data, export conversation and Q&A pairs using PDF endpoint
        const blob = await ApiService.exportConversationPDF(conversation, qaPairs);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thread_${conversation.id}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Export successful');
      } else {
        // For file data, export as PDF
        const blob = await ApiService.exportConversationPDF(conversation, qaPairs);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation_${conversation.id}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Export successful');
      }
    } catch (error) {
      console.error('Export to backend failed:', error);
      alert('Failed to export to backend. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadQAPair = async (questionMsg: Message, answerMsg: Message, format: 'json' | 'markdown' | 'docx' | 'pdf') => {
    const ratingInfo = getRatingInfo(answerMsg);
    const qaPair = {
      question: questionMsg,
      answer: answerMsg,
      rating: ratingInfo?.rating,
      comment: ratingInfo?.comment
    };
    
    const { jsonFilename, jsonData, markdownFilename, markdownContent, docxFilename, docxBlob, pdfFilename, pdfBlob } = 
      await formatQAPairForDownload(qaPair, conversation.id);
    
    if (format === 'json') {
      downloadAsJSON(jsonData, jsonFilename);
    } else if (format === 'markdown') {
      downloadAsMarkdown(markdownContent, markdownFilename);
    } else if (format === 'docx') {
      await downloadAsDocx(docxBlob, docxFilename);
    } else if (format === 'pdf' && pdfBlob) {
      await downloadAsPDF(pdfBlob, pdfFilename);
    }
    setQaDownloadMenus({ ...qaDownloadMenus, [answerMsg.id]: false });
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
        alert('Please select a prompt template in the Prompt Selector first.');
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
      
      if (promptConfig.parameters && Array.isArray(promptConfig.parameters)) {
        promptConfig.parameters.forEach((config: any) => {
          switch (config.source) {
            case 'conversation':
              if (dataSource === 'agent' && currentThread) {
                // For LangGraph data, build a conversation object with actual messages
                const conversationWithMessages = {
                  ...conversation,
                  messages: currentThread.values?.messages?.map((msg: any, index: number) => ({
                    id: msg.id || `${currentThread.thread_id}-${index}`,
                    parentId: null,
                    childrenIds: [],
                    role: msg.type === 'human' ? 'user' : 'assistant',
                    content: typeof msg.content === 'string' ? msg.content : 
                             typeof msg.text === 'string' ? msg.text :
                             typeof msg.content === 'object' && msg.content?.text ? msg.content.text :
                             JSON.stringify(msg.content || msg.text || ''),
                    timestamp: msg.timestamp || (msg.type === 'human' 
                      ? new Date(currentThread.created_at).getTime()
                      : new Date(currentThread.updated_at || currentThread.created_at).getTime()),
                    model: msg.response_metadata?.model_name || msg.model || 'unknown',
                    modelName: msg.response_metadata?.model_name || msg.model || 'AI Assistant'
                  })) || []
                };
                console.log('📝 [ConversationDetail] Building conversation for prompt with LangGraph data:');
                console.log(`   - Thread ID: ${currentThread.thread_id}`);
                console.log(`   - Original messages: ${currentThread.values?.messages?.length || 0}`);
                console.log(`   - Converted messages: ${conversationWithMessages.messages.length}`);
                parameterValues[config.name] = JSON.stringify(conversationWithMessages, null, 2);
              } else if (conversation) {
                // For OWUI data, use the conversation as is
                console.log('📝 [ConversationDetail] Using OWUI conversation for prompt:');
                console.log(`   - Conversation ID: ${conversation.id}`);
                console.log(`   - Messages: ${conversation.messages.length}`);
                parameterValues[config.name] = JSON.stringify(conversation, null, 2);
              }
              break;
            case 'qa':
              // For now, we'll use empty since we don't have Q&A context here
              parameterValues[config.name] = '{}';
              break;
            case 'current-date':
              parameterValues[config.name] = new Date().toLocaleDateString('en-CA');
              break;
            case 'current-datetime':
              parameterValues[config.name] = new Date().toLocaleString('en-CA', { 
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
              parameterValues[config.name] = config.customValue || '';
              break;
          }
        });
      }
      
      const startTime = Date.now();
      
      // Execute the prompt with parameters
      const response = await llmService.executePromptWithParameters(
        llmConfiguration,
        promptConfig.promptContent,
        parameterValues
      );
      
      console.log('LLM Response:', response);
      
      const duration = Date.now() - startTime;
      
      // Extract prompt name from file path
      const promptName = promptConfig.selectedFile.split('/').pop() || 'Unknown Prompt';
      
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
        <span>Chat</span>
      </button>
      {dataSource === 'agent' && (
        <button
          type="button"
          className={`tab-button-header ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          {Files && <Files size={16} />}
          <span>Documents</span>
        </button>
      )}
      {dataSource !== 'agent' && (
        <button
          type="button"
          className={`tab-button-header ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          {BarChart3 && <BarChart3 size={16} />}
          <span>Ratings</span>
        </button>
      )}
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
        title={isExporting ? "Exporting..." : "Export to backend (PDF)"}
      >
        {isExporting ? (
          <div className="button-spinner" />
        ) : (
          <Send size={16} />
        )}
      </button>
      <button
        type="button"
        className="view-toggle-button"
        onClick={() => setShowSourceView({
          ...showSourceView,
          [activeTab]: !showSourceView[activeTab]
        })}
        title={showSourceView[activeTab] ? "Show formatted view" : "Show source"}
      >
        {showSourceView[activeTab] ? <Eye size={16} /> : <Code size={16} />}
      </button>
      <div className="download-container" ref={downloadRef}>
        <button 
          type="button"
          className="download-button"
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          title={`Download ${dataSource === 'agent' ? 'thread' : 'conversation'}`}
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
    <div className="conversation-detail" ref={downloadRef}>
      <NoLogoHeader
        title={<h2>{conversation.title}</h2>}
        topRightControls={headerActions}
        subtitle={tabButtons}
        bottomRightControls={statsInfo}
        className="conversation-header"
        heightAdjustment={2}
      />

      {activeTab === 'text' ? (
        dataSource === 'agent' && currentThread ? (
          <LangGraphChatView 
            thread={currentThread} 
            showSourceView={showSourceView.text}
          />
        ) : dataSource === 'agent' ? (
          <div className="messages-container">
            <div className="empty-state">
              <p>Thread data not found. The thread may have been deleted or is still loading.</p>
            </div>
          </div>
        ) : (
          <OWUIChatView 
            conversation={conversation}
            qaPairs={qaPairs}
            showSourceView={showSourceView.text}
            onDownloadQAPair={handleDownloadQAPair}
          />
        )
      ) : activeTab === 'analytics' ? (
        showSourceView.analytics ? (
          <div className="raw-json-container">
            <CollapsibleJSON 
              data={{
                conversations: conversations,
                qaPairs: allQaPairs,
                selectedConversation: conversation
              }}
              defaultExpanded={false}
              maxInitialDepth={1}
            />
          </div>
        ) : (
          <div className="analytics-container">
            <AnalyticsDashboardNoHeader
              conversations={conversations}
              qaPairs={allQaPairs}
              selectedConversationId={conversation.id}
            />
          </div>
        )
      ) : activeTab === 'documents' ? (
        showSourceView.documents ? (
          <div className="raw-json-container">
            <CollapsibleJSON 
              data={documents || []}
              defaultExpanded={false}
              maxInitialDepth={1}
            />
          </div>
        ) : (
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
              {documents.map((doc, index) => {
                // Helper function to safely decode URLs
                const safeDecodeURI = (str: string) => {
                  try {
                    return decodeURIComponent(str);
                  } catch {
                    return str;
                  }
                };
                
                // Extract filename from URL
                const getFilenameFromUrl = (url: string) => {
                  try {
                    const decoded = safeDecodeURI(url);
                    const parts = decoded.split('/');
                    return parts[parts.length - 1] || decoded;
                  } catch {
                    return url;
                  }
                };
                
                return (
                  <div key={doc.id || index} className="document-item">
                    <div className="document-header">
                      <div className="document-icon">
                        <FileText size={20} />
                      </div>
                      <div className="document-meta">
                        <h4 className="document-title">
                          {doc.metadata?.title 
                            ? safeDecodeURI(doc.metadata.title)
                            : doc.metadata?.url 
                            ? getFilenameFromUrl(doc.metadata.url)
                            : `Document ${index + 1}`}
                        </h4>
                        {doc.metadata?.url && (
                          <a 
                            href={doc.metadata.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="document-url"
                            title={safeDecodeURI(doc.metadata.url)}
                          >
                            {safeDecodeURI(doc.metadata.url)}
                          </a>
                        )}
                      </div>
                    </div>
                  <div className="document-content">
                    {(() => {
                      // Determine file type from URL or title
                      const fileName = doc.metadata?.url 
                        ? getFilenameFromUrl(doc.metadata.url)
                        : doc.metadata?.title || '';
                      
                      const isMarkdown = fileName.toLowerCase().endsWith('.md') || 
                                       fileName.toLowerCase().endsWith('.markdown');
                      
                      const content = doc.page_content || JSON.stringify(doc, null, 2);
                      
                      if (isMarkdown) {
                        return (
                          <div className="document-markdown">
                            <ReactMarkdown>{content}</ReactMarkdown>
                          </div>
                        );
                      } else {
                        // For .txt files and others, render as plain text
                        return <pre>{content}</pre>;
                      }
                    })()}
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
                );
              })}
            </div>
          )}
        </div>
        )
      ) : null}
      <PromptSelectorModal 
        isOpen={showPromptSelector} 
        onClose={() => setShowPromptSelector(false)} 
        conversation={
          dataSource === 'agent' && currentThread && conversation ? {
            ...conversation,
            messages: currentThread.values?.messages?.map((msg: any, index: number) => ({
              id: msg.id || `${currentThread.thread_id}-${index}`,
              parentId: null,
              childrenIds: [],
              role: msg.type === 'human' ? 'user' : 'assistant',
              content: typeof msg.content === 'string' ? msg.content : 
                       typeof msg.text === 'string' ? msg.text :
                       typeof msg.content === 'object' && msg.content?.text ? msg.content.text :
                       JSON.stringify(msg.content || msg.text || ''),
              timestamp: msg.timestamp || (msg.type === 'human' 
                ? new Date(currentThread.created_at).getTime()
                : new Date(currentThread.updated_at || currentThread.created_at).getTime()),
              model: msg.response_metadata?.model_name || msg.model || 'unknown',
              modelName: msg.response_metadata?.model_name || msg.model || 'AI Assistant'
            })) || []
          } : conversation
        }
      />
      <PromptResultsModal
        isOpen={showPromptResults}
        onClose={() => setShowPromptResults(false)}
        result={promptExecutionResult}
      />
    </div>
  );
}