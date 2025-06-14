import { useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { User, Bot, ThumbsUp, ThumbsDown, Download, FileJson, FileText, File } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { Message } from '../../types/feedback';
import './OWUIChatView.css';

interface OWUIChatViewProps {
  conversation: Conversation;
  qaPairs: QAPair[];
  showSourceView?: boolean;
  onDownloadQAPair?: (question: Message, answer: Message, format: 'json' | 'markdown' | 'docx' | 'pdf') => void;
}

export function OWUIChatView({ conversation, qaPairs, showSourceView = false, onDownloadQAPair }: OWUIChatViewProps) {
  const [qaDownloadMenus, setQaDownloadMenus] = useState<{ [key: string]: boolean }>({});
  
  console.log(`📋 [OWUIChatView] Rendering conversation: ${conversation.id}`);
  console.log(`   - Messages: ${conversation.messages.length}`);
  console.log(`   - Q/A Pairs: ${qaPairs.length}`);
  console.log(`   - Source view: ${showSourceView}`);
  const renderStartTime = performance.now();

  if (showSourceView) {
    return (
      <div className="raw-json-container">
        <pre className="raw-json-content">
          {JSON.stringify(conversation, null, 2)}
        </pre>
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

  const renderRating = (rating: number | null, sentiment: 1 | -1 | null) => {
    if (rating === null && sentiment === null) return null;
    
    return (
      <div className="rating-indicator">
        {sentiment === 1 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
        {rating && <span className="rating-value">{rating}/10</span>}
      </div>
    );
  };

  const toggleQaDownloadMenu = (messageId: string) => {
    setQaDownloadMenus({
      ...qaDownloadMenus,
      [messageId]: !qaDownloadMenus[messageId]
    });
  };

  const handleDownloadQAPair = async (questionMsg: Message, answerMsg: Message, format: 'json' | 'markdown' | 'docx' | 'pdf') => {
    if (onDownloadQAPair) {
      onDownloadQAPair(questionMsg, answerMsg, format);
    }
    setQaDownloadMenus({ ...qaDownloadMenus, [answerMsg.id]: false });
  };

  const component = (
    <div className="messages-container owui-messages">
      {conversation.messages.map((message, index) => {
        if (index === 0) {
          console.log(`   - Rendering ${conversation.messages.length} messages...`);
        }
        const ratingInfo = message.role === 'assistant' ? getRatingInfo(message) : null;
        
        return (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <div className="message-avatar">
                {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-meta">
                <span className="message-role">
                  {message.role === 'user' ? 'User' : (message.modelName || 'AI Assistant')}
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
  );
  
  const renderEndTime = performance.now();
  console.log(`✅ [OWUIChatView] Render completed in ${(renderEndTime - renderStartTime).toFixed(2)}ms`);
  
  return component;
}