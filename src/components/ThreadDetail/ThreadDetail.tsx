import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { User, Bot, Download, FileJson, FileText, File, Eye } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { NoLogoHeader } from '../NoLogoHeader/NoLogoHeader';
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
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
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

  return (
    <div className="conversation-detail thread-detail">
      <NoLogoHeader 
        title={<h2>Thread {conversation.id.slice(0, 8)}...</h2>}
        subtitle={
          <span className="thread-date">
            Created: {format(new Date(conversation.createdAt), 'MMM d, yyyy h:mm a')}
          </span>
        }
        bottomRightControls={
          <div className="thread-actions">
            <button 
              className="action-button"
              onClick={() => setShowRawJson(!showRawJson)}
              title="Toggle raw JSON view"
            >
              <Eye size={16} />
            </button>
            
            <div className="download-container" ref={downloadRef}>
              <button 
                className="action-button"
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
        }
      />

      <div className="thread-content">
        {showRawJson ? (
          <div className="raw-json-view">
            <div className="raw-json-header">
              <h3>Raw Thread Data</h3>
              <button className="close-raw-json" onClick={() => setShowRawJson(false)}>
                Close
              </button>
            </div>
            <pre className="raw-json-content">
              <code>{JSON.stringify(conversation, null, 2)}</code>
            </pre>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}