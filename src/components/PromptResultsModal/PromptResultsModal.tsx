import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useResizable } from '../../hooks/useResizable';
import './PromptResultsModal.css';

interface PromptResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    message: string;
    response?: string;
    error?: string;
    timestamp?: Date;
    duration?: number;
    promptName?: string;
    llmConfiguration?: string;
  } | null;
}

export const PromptResultsModal: React.FC<PromptResultsModalProps> = ({ 
  isOpen, 
  onClose, 
  result 
}) => {
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth: 700,
    defaultHeight: 500,
    minWidth: 400,
    minHeight: 300,
    storageKey: 'promptResultsModalSize'
  });

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

  const handleCopyToClipboard = () => {
    if (result?.response) {
      navigator.clipboard.writeText(result.response);
      // Could add a toast notification here
    }
  };

  const handleDownloadAsText = () => {
    if (result?.response) {
      const blob = new Blob([result.response], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-result-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen || !result) return null;

  return (
    <div className="modal-overlay" onClick={(e) => handleOverlayClick(e, onClose)}>
      <div 
        ref={modalRef}
        className={`prompt-results-modal resizable ${isResizing ? 'resizing' : ''}`}
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

        <div className={`modal-header ${result.success ? 'success' : 'error'}`}>
          <div className="header-content">
            <div className="status-icon">
              {result.success ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>
            <h2>{result.message}</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">

          {/* Metadata section */}
          <div className="result-metadata">
            {result.promptName && (
              <div className="metadata-item">
                <span className="metadata-label">Prompt:</span>
                <span className="metadata-value">{result.promptName}</span>
              </div>
            )}
            {result.llmConfiguration && (
              <div className="metadata-item">
                <span className="metadata-label">Model:</span>
                <span className="metadata-value">{result.llmConfiguration}</span>
              </div>
            )}
            {result.timestamp && (
              <div className="metadata-item">
                <span className="metadata-label">Executed:</span>
                <span className="metadata-value">
                  {format(result.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                </span>
              </div>
            )}
            {result.duration && (
              <div className="metadata-item">
                <span className="metadata-label">Duration:</span>
                <span className="metadata-value">
                  <Clock size={14} />
                  {result.duration}ms
                </span>
              </div>
            )}
          </div>

          {/* Response section */}
          {result.response && (
            <div className="result-response-section">
              <div className="response-header">
                <h3>Response</h3>
                <div className="response-actions">
                  <button
                    className="action-button"
                    onClick={handleCopyToClipboard}
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="action-button"
                    onClick={handleDownloadAsText}
                    title="Download as text"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
              <div className="response-content">
                <pre>{result.response}</pre>
              </div>
            </div>
          )}

          {/* Error details if any */}
          {result.error && !result.response && (
            <div className="error-details">
              <h3>Error Details</h3>
              <pre className="error-content">{result.error}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};