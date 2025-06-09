import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { User, Bot, ThumbsUp, ThumbsDown, Download, FileJson, FileText, File, Code, Eye, Send, Settings, Sparkles, FileSearch } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { Message } from '../../types/feedback';
import { NoLogoHeader } from '../NoLogoHeader/NoLogoHeader';
import { SettingsModal } from '../SettingsModal/SettingsModal';
import { PromptSelectorModal } from '../PromptSelectorModal/PromptSelectorModal';
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
import { storageUtils } from '../../utils/storageUtils';
import './ConversationDetail.css';

interface ConversationDetailProps {
  conversation: Conversation | null;
  qaPairs: QAPair[];
}

export function ConversationDetail({ conversation, qaPairs }: ConversationDetailProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [qaDownloadMenus, setQaDownloadMenus] = useState<{ [key: string]: boolean }>({});
  const [showRawJson, setShowRawJson] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const handleDownloadButtonClick = () => {
    console.log('Download button clicked, current state:', showDownloadMenu);
    setShowDownloadMenu(!showDownloadMenu);
  };

  if (!conversation) {
    return (
      <div className="conversation-detail-empty">
        <p>Select a conversation to view details</p>
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

  const handleDownloadConversation = async (format: 'json' | 'markdown' | 'docx' | 'pdf') => {
    try {
      console.log('Download conversation triggered:', format);
      const { jsonFilename, jsonData, markdownFilename, markdownContent, docxFilename, docxBlob, pdfFilename, pdfBlob } = 
        await formatConversationForDownload(conversation, qaPairs);
      
      if (format === 'json') {
        console.log('Downloading JSON:', jsonFilename);
        downloadAsJSON(jsonData, jsonFilename);
      } else if (format === 'markdown') {
        console.log('Downloading Markdown:', markdownFilename);
        downloadAsMarkdown(markdownContent, markdownFilename);
      } else if (format === 'docx') {
        console.log('Downloading DOCX:', docxFilename);
        await downloadAsDocx(docxBlob, docxFilename);
      } else if (format === 'pdf' && pdfBlob) {
        console.log('Downloading PDF:', pdfFilename);
        await downloadAsPDF(pdfBlob, pdfFilename);
      }
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleExportToBackend = async () => {
    setIsExporting(true);
    try {
      console.log('Exporting conversation to backend...');
      const blob = await ApiService.exportConversationPDF(conversation, qaPairs);
      
      // Create a download link for the returned PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation_${conversation.id}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Export successful');
    } catch (error) {
      console.error('Export to backend failed:', error);
      alert('Failed to export conversation. Please ensure the backend service is running.');
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

  const toggleQaDownloadMenu = (messageId: string) => {
    setQaDownloadMenus({
      ...qaDownloadMenus,
      [messageId]: !qaDownloadMenus[messageId]
    });
  };

  const renderRating = (rating: number | null, sentiment: 1 | -1 | null) => {
    if (rating === null && sentiment === null) return null;
    
    return (
      <div className="rating-indicator">
        {sentiment === 1 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
        {rating && <span className="rating-value">{rating}/10</span>}
      </div>
    );
  };

  const handleExecutePrompt = async () => {
    if (!conversation) return;
    
    try {
      // Get the selected LLM configuration from localStorage
      const llmConfiguration = llmService.getSelectedConfiguration();
      if (!llmConfiguration) {
        alert('Please select an LLM configuration in Settings first.');
        setShowSettings(true);
        return;
      }
      
      const promptsFolder = storageUtils.getPromptsFolder();
      const promptFilePath = `${promptsFolder}/analysis/default.md`; // This can be selected from GitHub files later
      
      console.log('Executing prompt with:', {
        llmConfiguration,
        promptFilePath,
        conversationId: conversation.id
      });
      
      const response = await llmService.executePrompt(
        llmConfiguration,
        promptFilePath,
        conversation
      );
      
      if (response.success) {
        alert(`Prompt execution started!\nRequest ID: ${response.requestId}`);
      } else {
        alert(`Error: ${response.error || response.message}`);
      }
    } catch (error) {
      console.error('Error executing prompt:', error);
      alert('Failed to execute prompt. Please check the console for details.');
    }
  };

  const statsInfo = (
    <div className="stats-info">
      <span>Q&A pairs: {conversation.qaPairCount}</span>
      <span>Rated responses: {conversation.totalRatings}</span>
      {conversation.averageRating && (
        <span>Average rating: {conversation.averageRating.toFixed(1)}/10</span>
      )}
    </div>
  );

  const headerActions = (
    <div className="header-actions">
      <button
        type="button"
        className="settings-button"
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
        <Settings size={16} />
      </button>
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
        title="Execute LLM prompt"
      >
        <Sparkles size={16} />
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
        onClick={() => setShowRawJson(!showRawJson)}
        title={showRawJson ? "Show formatted view" : "Show raw JSON"}
      >
        {showRawJson ? <Eye size={16} /> : <Code size={16} />}
      </button>
      <div className="download-button-container">
        <button 
          type="button"
          className="download-button"
          onClick={() => {
            console.log('Button clicked directly!');
            handleDownloadButtonClick();
          }}
        >
          <Download size={16} />
        </button>
        {showDownloadMenu && (
          <div className="download-menu">
            <button 
              type="button"
              className="download-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                console.log('JSON button clicked');
                handleDownloadConversation('json');
              }}
            >
              <FileJson size={16} />
              <span>Chat as JSON</span>
            </button>
            <button 
              type="button"
              className="download-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Markdown button clicked');
                handleDownloadConversation('markdown');
              }}
            >
              <FileText size={16} />
              <span>Chat as Markdown</span>
            </button>
            <button 
              type="button"
              className="download-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                console.log('DOCX button clicked');
                handleDownloadConversation('docx');
              }}
            >
              <File size={16} />
              <span>Chat as Word</span>
            </button>
            <button 
              type="button"
              className="download-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                console.log('PDF button clicked');
                handleDownloadConversation('pdf');
              }}
            >
              <File size={16} />
              <span>Chat as PDF (Server)</span>
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
        subtitle={statsInfo}
        bottomRightControls={headerActions}
        className="conversation-header"
        heightAdjustment={2}
      />

      {showRawJson ? (
        <div className="raw-json-container">
          <pre className="raw-json-content">
            {JSON.stringify(conversation, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="messages-container">
          {conversation.messages.map((message, index) => {
          const ratingInfo = message.role === 'assistant' ? getRatingInfo(message) : null;
          
          return (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-header">
                <div className="message-avatar">
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-meta">
                  <span className="message-role">
                    {message.role === 'user' ? 'User' : message.modelName || 'AI Assistant'}
                  </span>
                  {message.model && (
                    <span className="message-model">({message.model})</span>
                  )}
                  <span className="message-time">
                    {format(new Date(message.timestamp * 1000), 'HH:mm:ss')}
                  </span>
                </div>
                {ratingInfo && renderRating(ratingInfo.rating, ratingInfo.sentiment)}
                {message.role === 'assistant' && index > 0 && conversation.messages[index - 1].role === 'user' && (
                  <div className="qa-download-container">
                    <button 
                      className="qa-download-button"
                      onClick={() => toggleQaDownloadMenu(message.id)}
                      title="Download Q&A"
                    >
                      <Download size={14} />
                    </button>
                    {qaDownloadMenus[message.id] && (
                      <div className="download-menu qa-download-menu">
                        <button 
                          className="download-menu-item"
                          onClick={() => handleDownloadQAPair(conversation.messages[index - 1], message, 'json')}
                        >
                          <FileJson size={14} />
                          <span>Q&A as JSON</span>
                        </button>
                        <button 
                          className="download-menu-item"
                          onClick={() => handleDownloadQAPair(conversation.messages[index - 1], message, 'markdown')}
                        >
                          <FileText size={14} />
                          <span>Q&A as Markdown</span>
                        </button>
                        <button 
                          className="download-menu-item"
                          onClick={() => handleDownloadQAPair(conversation.messages[index - 1], message, 'docx')}
                        >
                          <File size={14} />
                          <span>Q&A as Word</span>
                        </button>
                        <button 
                          className="download-menu-item"
                          onClick={() => handleDownloadQAPair(conversation.messages[index - 1], message, 'pdf')}
                        >
                          <File size={14} />
                          <span>Q&A as PDF (Server)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="message-content">
                {message.role === 'user' ? (
                  <p>{message.content}</p>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>
              
              {ratingInfo?.comment && (
                <div className="feedback-comment">
                  <span className="comment-label">Feedback:</span>
                  <p>{ratingInfo.comment}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <PromptSelectorModal 
        isOpen={showPromptSelector} 
        onClose={() => setShowPromptSelector(false)} 
        conversation={conversation}
      />
    </div>
  );
}