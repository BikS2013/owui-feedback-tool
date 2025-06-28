import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Clock, X, Trash2, Copy } from 'lucide-react';
import { Tooltip } from '../Tooltip/Tooltip';
import './HistoryNavigationControl.css';

interface HistoryNavigationControlProps {
  queryHistory: string[];
  historyIndex: number;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onClearHistory: () => void;
  onSelectQuery: (query: string) => void;
  onDeleteQuery: (index: number) => void;
  displayMode?: 'engineering' | 'magic';
  className?: string;
}

export function HistoryNavigationControl({
  queryHistory,
  historyIndex,
  onNavigateUp,
  onNavigateDown,
  onClearHistory,
  onSelectQuery,
  onDeleteQuery,
  displayMode = 'engineering',
  className = ''
}: HistoryNavigationControlProps) {
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [copiedHistory, setCopiedHistory] = useState(false);
  const historyListRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isUpDisabled = queryHistory.length === 0 || historyIndex >= queryHistory.length - 1;
  const isDownDisabled = historyIndex < 0;
  const isHistoryDisabled = queryHistory.length === 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyListRef.current && !historyListRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowHistoryList(false);
      }
    };

    if (showHistoryList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistoryList]);

  const handleSelectQuery = (query: string) => {
    onSelectQuery(query);
    setShowHistoryList(false);
  };

  const handleDeleteQuery = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent triggering the select action
    onDeleteQuery(index);
  };

  const handleCopyHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (queryHistory.length === 0) return;

    try {
      // Format history as numbered list
      const historyText = queryHistory
        .map((query, index) => `${index + 1}. ${query}`)
        .join('\n');
      
      await navigator.clipboard.writeText(historyText);
      setCopiedHistory(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedHistory(false), 2000);
    } catch (err) {
      console.error('Failed to copy history:', err);
    }
  };

  return (
    <div className={`history-navigation-control ${displayMode} ${className}`}>
      <Tooltip text="Previous query (⌥↑)" position="bottom">
        <button
          className="history-nav-btn"
          onClick={onNavigateUp}
          disabled={isUpDisabled}
          aria-label="Navigate to previous query"
        >
          <ChevronUp size={16} />
        </button>
      </Tooltip>
      <Tooltip text="Next query (⌥↓)" position="bottom">
        <button
          className="history-nav-btn"
          onClick={onNavigateDown}
          disabled={isDownDisabled}
          aria-label="Navigate to next query"
        >
          <ChevronDown size={16} />
        </button>
      </Tooltip>
      <div className="history-list-container">
        <Tooltip text="Show query history" position="bottom">
          <button
            ref={buttonRef}
            className="history-list-btn"
            onClick={() => setShowHistoryList(!showHistoryList)}
            disabled={isHistoryDisabled}
            aria-label="Show query history list"
          >
            <Clock size={16} />
          </button>
        </Tooltip>
        {showHistoryList && (
          <div ref={historyListRef} className="history-list-dropdown">
            <div className="history-list-header">
              <div className="history-list-title">
                <span>Query History</span>
                <span className="history-count">{queryHistory.length}</span>
              </div>
              <div className="history-header-actions">
                <Tooltip text={copiedHistory ? "Copied!" : "Copy all history to clipboard"} position="bottom">
                  <button
                    className="history-copy-btn"
                    onClick={handleCopyHistory}
                    disabled={queryHistory.length === 0}
                    aria-label="Copy all query history"
                  >
                    <Copy size={14} />
                    {copiedHistory && <span className="copied-text">Copied!</span>}
                  </button>
                </Tooltip>
                <Tooltip text="Clear all history" position="bottom">
                  <button
                    className="history-clear-all-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearHistory();
                      setShowHistoryList(false);
                    }}
                    disabled={queryHistory.length === 0}
                    aria-label="Clear all query history"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className="history-list-items">
              {queryHistory.map((query, index) => (
                <div
                  key={index}
                  className={`history-list-item ${index === historyIndex ? 'current' : ''}`}
                  onClick={() => handleSelectQuery(query)}
                  title={query}
                >
                  <span className="history-item-text">{query}</span>
                  <div className="history-item-actions">
                    {index === historyIndex && <span className="current-indicator">●</span>}
                    <Tooltip text="Delete this query" position="left">
                      <button
                        className="history-delete-btn"
                        onClick={(e) => handleDeleteQuery(e, index)}
                        aria-label="Delete query from history"
                      >
                        <X size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}