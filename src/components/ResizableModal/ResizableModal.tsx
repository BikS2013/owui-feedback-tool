import React, { useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useResizable } from '../../hooks/useResizable';
import './ResizableModal.css';

interface ResizableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  storageKey?: string;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

export function ResizableModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  defaultWidth = 600,
  defaultHeight = 500,
  minWidth = 400,
  minHeight = 400,
  storageKey,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  headerContent,
  footerContent
}: ResizableModalProps) {
  // Use resizable hook
  const {
    modalRef,
    modalSize,
    isResizing,
    handleResizeStart,
    handleOverlayClick
  } = useResizable({
    defaultWidth,
    defaultHeight,
    minWidth,
    minHeight,
    storageKey
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose, closeOnEscape]);

  // Handle overlay click
  const handleOverlayClickWrapper = (e: React.MouseEvent) => {
    if (closeOnOverlayClick) {
      handleOverlayClick(e, onClose);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="resizable-modal-overlay" onClick={handleOverlayClickWrapper}>
      <div className="resizable-modal-wrapper">
        <div 
          ref={modalRef}
          className={`resizable-modal ${isResizing ? 'resizing' : ''} ${className}`} 
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
          
          {/* Modal header */}
          <div className="resizable-modal-header">
            <h2 className="resizable-modal-title">{title}</h2>
            {headerContent && (
              <div className="resizable-modal-header-content">
                {headerContent}
              </div>
            )}
            {showCloseButton && (
              <button className="resizable-modal-close" onClick={onClose} aria-label="Close modal">
                <X size={20} />
              </button>
            )}
          </div>

          {/* Modal body */}
          <div className="resizable-modal-body">
            {children}
          </div>

          {/* Modal footer (optional) */}
          {footerContent && (
            <div className="resizable-modal-footer">
              {footerContent}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}