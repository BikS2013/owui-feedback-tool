import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Copy, Download } from 'lucide-react';
import { GraphSpec } from '../../utils/javascriptRender';
import './RenderingOverlay.css';
import 'highlight.js/styles/github.css';

// Register all Chart.js components
ChartJS.register(...registerables);

interface RenderingOverlayProps {
  isVisible: boolean;
  content: string | GraphSpec;
  contentType: 'markdown' | 'graph' | 'error';
  onClose: () => void;
  onClear?: () => void;
  onMinimize?: () => void;
  position?: 'full' | 'top' | 'bottom';
  error?: string;
}

export const RenderingOverlay: React.FC<RenderingOverlayProps> = ({
  isVisible,
  content,
  contentType,
  onClose,
  onClear: _onClear,
  onMinimize,
  position = 'full',
  error
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    // Reset minimized state when visibility changes
    if (!isVisible) {
      setIsMinimized(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (onMinimize) {
      onMinimize();
    }
  };

  const handleCopy = async () => {
    try {
      if (contentType === 'markdown' && typeof content === 'string') {
        await navigator.clipboard.writeText(content);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } else if (contentType === 'graph' && chartRef.current) {
        // Copy graph as image data URL
        const canvas = chartRef.current.canvas;
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              setCopyFeedback(true);
              setTimeout(() => setCopyFeedback(false), 2000);
            } catch (err) {
              console.error('Failed to copy image:', err);
              // Fallback: copy as data URL
              const dataUrl = canvas.toDataURL();
              await navigator.clipboard.writeText(dataUrl);
              setCopyFeedback(true);
              setTimeout(() => setCopyFeedback(false), 2000);
            }
          }
        });
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (contentType === 'markdown' && typeof content === 'string') {
      // Download markdown as .md file
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (contentType === 'graph' && chartRef.current) {
      // Download graph as PNG
      const canvas = chartRef.current.canvas;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const renderContent = () => {
    if (contentType === 'error') {
      return (
        <div className="rendering-overlay-error">
          <h3>Error</h3>
          <p>{error || 'An error occurred while rendering the content.'}</p>
        </div>
      );
    }

    if (contentType === 'markdown' && typeof content === 'string') {
      return (
        <div className="rendering-overlay-markdown">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,        // GitHub Flavored Markdown (tables, strikethrough, etc.)
              remarkBreaks      // Convert line breaks to <br> tags
            ]}
            rehypePlugins={[
              rehypeHighlight,  // Syntax highlighting for code blocks
              rehypeRaw        // Allow raw HTML (use with caution)
            ]}
            components={{
              // Custom rendering for specific elements
              table: ({ node, ...props }: any) => (
                <div className="table-wrapper">
                  <table {...props} />
                </div>
              ),
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match || (node?.position?.start.line === node?.position?.end.line);
                
                return !isInline ? (
                  <pre className={className}>
                    <code {...props} className={className}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                );
              },
              // Ensure links open in new tabs for security
              a: ({ node, ...props }: any) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    if (contentType === 'graph' && typeof content === 'object') {
      const graphSpec = content as GraphSpec;
      return (
        <div className="rendering-overlay-graph">
          <Chart
            ref={chartRef}
            type={graphSpec.type}
            data={graphSpec.data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              ...graphSpec.options
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`rendering-overlay ${position} ${isMinimized ? 'minimized' : ''}`}>
      <div className="rendering-overlay-header">
        <h2 className="rendering-overlay-title">
          {contentType === 'markdown' ? 'Report' : contentType === 'graph' ? 'Visualization' : 'Content'}
        </h2>
        <div className="rendering-overlay-controls">
          {contentType !== 'error' && (
            <>
              <button
                className="rendering-overlay-button action-button"
                onClick={handleCopy}
                title={contentType === 'markdown' ? 'Copy markdown' : 'Copy graph as image'}
              >
                <Copy size={16} />
                {copyFeedback && <span className="feedback-text">Copied!</span>}
              </button>
              <button
                className="rendering-overlay-button action-button"
                onClick={handleDownload}
                title={contentType === 'markdown' ? 'Download as .md file' : 'Download as PNG'}
              >
                <Download size={16} />
              </button>
            </>
          )}
          <button
            className="rendering-overlay-button minimize-button"
            onClick={handleMinimize}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            className="rendering-overlay-button close-button"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="rendering-overlay-content">
          {renderContent()}
        </div>
      )}
    </div>
  );
};