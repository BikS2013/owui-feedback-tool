import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { User, Bot, ThumbsUp, ThumbsDown, Download, FileJson, FileText, Code, Eye } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { Message } from '../../types/feedback';
import { 
  downloadAsJSON, 
  downloadAsMarkdown, 
  formatConversationForDownload, 
  formatQAPairForDownload 
} from '../../utils/downloadUtils';
import './ConversationDetail.css';

interface ConversationDetailProps {
  conversation: Conversation | null;
  qaPairs: QAPair[];
}

export function ConversationDetail({ conversation, qaPairs }: ConversationDetailProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [qaDownloadMenus, setQaDownloadMenus] = useState<{ [key: string]: boolean }>({});
  const [showRawJson, setShowRawJson] = useState(false);
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

  const handleDownloadConversation = (format: 'json' | 'markdown') => {
    try {
      console.log('Download conversation triggered:', format);
      const { jsonFilename, jsonData, markdownFilename, markdownContent } = 
        formatConversationForDownload(conversation, qaPairs);
      
      if (format === 'json') {
        console.log('Downloading JSON:', jsonFilename);
        downloadAsJSON(jsonData, jsonFilename);
      } else {
        console.log('Downloading Markdown:', markdownFilename);
        downloadAsMarkdown(markdownContent, markdownFilename);
      }
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleDownloadQAPair = (questionMsg: Message, answerMsg: Message, format: 'json' | 'markdown') => {
    const ratingInfo = getRatingInfo(answerMsg);
    const qaPair = {
      question: questionMsg,
      answer: answerMsg,
      rating: ratingInfo?.rating,
      comment: ratingInfo?.comment
    };
    
    const { jsonFilename, jsonData, markdownFilename, markdownContent } = 
      formatQAPairForDownload(qaPair, conversation.id);
    
    if (format === 'json') {
      downloadAsJSON(jsonData, jsonFilename);
    } else {
      downloadAsMarkdown(markdownContent, markdownFilename);
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

  return (
    <div className="conversation-detail" ref={downloadRef}>
      <div className="conversation-header">
        <div className="conversation-header-top">
          <h2>{conversation.title}</h2>
        </div>
        <div className="conversation-stats">
          <div className="stats-info">
            <span>Q&A pairs: {conversation.qaPairCount}</span>
            <span>Rated responses: {conversation.totalRatings}</span>
            {conversation.averageRating && (
              <span>Average rating: {conversation.averageRating.toFixed(1)}/10</span>
            )}
          </div>
          <div className="header-actions">
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
                  <span>Download as JSON</span>
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
                  <span>Download as Markdown</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}