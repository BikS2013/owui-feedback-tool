import { useMemo, useState, useRef, useEffect } from 'react';
import { Download, FileJson, FileText } from 'lucide-react';
import { Conversation, QAPair } from '../../types/conversation';
import { useFeedbackStore } from '../../store/feedbackStore';
import { 
  prepareAnalyticsExportData, 
  exportAnalyticsAsJSON, 
  exportAnalyticsAsMarkdown 
} from '../../utils/analyticsExportUtils';
import { CircularProgress } from '../CircularProgress/CircularProgress';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  conversations: Conversation[];
  qaPairs: QAPair[];
  selectedConversationId: string | null;
}

interface RatingDistribution {
  rating: number;
  count: number;
  conversationIds: string[];
}

export function AnalyticsDashboard({ 
  conversations, 
  qaPairs,
  selectedConversationId 
}: AnalyticsDashboardProps) {
  const { selectedAnalyticsModel, setSelectedAnalyticsModel, filters } = useFeedbackStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (exportRef.current && !exportRef.current.contains(target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get unique models from conversations
  const availableModels = useMemo(() => {
    const models = new Set<string>();
    conversations.forEach(conv => {
      conv.modelsUsed?.forEach(model => models.add(model));
    });
    return Array.from(models).sort();
  }, [conversations]);

  // Filter conversations by selected model
  const filteredConversations = useMemo(() => {
    if (!selectedAnalyticsModel || selectedAnalyticsModel === 'all') {
      return conversations;
    }
    return conversations.filter(conv => 
      conv.modelsUsed?.includes(selectedAnalyticsModel)
    );
  }, [conversations, selectedAnalyticsModel]);

  // Calculate conversation-based metrics
  const conversationMetrics = useMemo(() => {
    const ratingDistribution: RatingDistribution[] = [];
    let ratedCount = 0;
    let unratedCount = 0;
    let totalRating = 0;
    let ratingCount = 0;

    // Initialize rating distribution (1-10)
    for (let i = 1; i <= 10; i++) {
      ratingDistribution.push({ rating: i, count: 0, conversationIds: [] });
    }

    filteredConversations.forEach(conv => {
      if (conv.averageRating !== null) {
        ratedCount++;
        const roundedRating = Math.round(conv.averageRating);
        const ratingIndex = roundedRating - 1;
        if (ratingIndex >= 0 && ratingIndex < 10) {
          ratingDistribution[ratingIndex].count++;
          ratingDistribution[ratingIndex].conversationIds.push(conv.id);
        }
        totalRating += conv.averageRating;
        ratingCount++;
      } else {
        unratedCount++;
      }
    });

    const overallAverage = ratingCount > 0 ? totalRating / ratingCount : null;

    return {
      ratingDistribution,
      ratedCount,
      unratedCount,
      overallAverage,
      totalCount: filteredConversations.length
    };
  }, [filteredConversations]);

  // Calculate Q&A-based metrics
  const qaMetrics = useMemo(() => {
    const ratingDistribution: RatingDistribution[] = [];
    let ratedCount = 0;
    let unratedCount = 0;
    let totalRating = 0;

    // Initialize rating distribution (1-10)
    for (let i = 1; i <= 10; i++) {
      ratingDistribution.push({ rating: i, count: 0, conversationIds: [] });
    }

    // Filter Q&A pairs by selected model
    const filteredQAPairs = selectedAnalyticsModel && selectedAnalyticsModel !== 'all'
      ? qaPairs.filter(qa => {
          const conv = conversations.find(c => c.id === qa.conversationId);
          return conv?.modelsUsed?.includes(selectedAnalyticsModel);
        })
      : qaPairs;

    filteredQAPairs.forEach(qa => {
      if (qa.rating !== null) {
        ratedCount++;
        const ratingIndex = qa.rating - 1;
        if (ratingIndex >= 0 && ratingIndex < 10) {
          ratingDistribution[ratingIndex].count++;
          if (!ratingDistribution[ratingIndex].conversationIds.includes(qa.conversationId)) {
            ratingDistribution[ratingIndex].conversationIds.push(qa.conversationId);
          }
        }
        totalRating += qa.rating;
      } else {
        unratedCount++;
      }
    });

    const overallAverage = ratedCount > 0 ? totalRating / ratedCount : null;

    return {
      ratingDistribution,
      ratedCount,
      unratedCount,
      overallAverage,
      totalCount: filteredQAPairs.length
    };
  }, [qaPairs, conversations, selectedAnalyticsModel]);

  // Check if selected conversation matches current model filter
  const isSelectedConversationHighlighted = useMemo(() => {
    if (!selectedConversationId || !selectedAnalyticsModel || selectedAnalyticsModel === 'all') {
      return false;
    }
    const selectedConv = conversations.find(c => c.id === selectedConversationId);
    return selectedConv?.modelsUsed?.includes(selectedAnalyticsModel) || false;
  }, [selectedConversationId, conversations, selectedAnalyticsModel]);

  // Get selected conversation's metrics position
  const selectedConversationMetrics = useMemo(() => {
    if (!selectedConversationId || !isSelectedConversationHighlighted) {
      return null;
    }
    
    const selectedConv = conversations.find(c => c.id === selectedConversationId);
    if (!selectedConv) return null;

    const avgRating = selectedConv.averageRating;
    const ratingBucket = avgRating !== null ? Math.round(avgRating) : null;
    const isRated = avgRating !== null;

    return {
      conversationId: selectedConversationId,
      ratingBucket,
      isRated,
      averageRating: avgRating
    };
  }, [selectedConversationId, conversations, isSelectedConversationHighlighted]);

  // Export handlers
  const handleExport = (format: 'json' | 'markdown') => {
    try {
      const exportData = prepareAnalyticsExportData(
        filteredConversations,
        qaPairs,
        conversationMetrics,
        qaMetrics,
        selectedAnalyticsModel,
        filters.searchTerm
      );

      if (format === 'json') {
        exportAnalyticsAsJSON(exportData, selectedAnalyticsModel);
      } else {
        exportAnalyticsAsMarkdown(exportData, selectedAnalyticsModel);
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <div className="analytics-header-top">
          <h2>Analytics Dashboard</h2>
        </div>
        <div className="analytics-stats">
          <div className="stats-info">
            <span>Total conversations: {filteredConversations.length}</span>
            <span>Rated: {conversationMetrics.ratedCount}</span>
            <span>Unrated: {conversationMetrics.unratedCount}</span>
          </div>
          <div className="stats-actions">
            <div className="export-button-container" ref={exportRef}>
              <button 
                type="button"
                className="export-button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export analytics"
              >
                <Download size={16} />
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button 
                    type="button"
                    className="export-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('json');
                    }}
                  >
                    <FileJson size={16} />
                    <span>Export as JSON</span>
                  </button>
                  <button 
                    type="button"
                    className="export-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('markdown');
                    }}
                  >
                    <FileText size={16} />
                    <span>Export as Markdown</span>
                  </button>
                </div>
              )}
            </div>
            <div className="model-selector">
              <label htmlFor="model-select">Model:</label>
              <select 
                id="model-select"
                value={selectedAnalyticsModel || 'all'} 
                onChange={(e) => setSelectedAnalyticsModel(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">All Models</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        <div className="metrics-section">
          <h3>Conversation Metrics</h3>
          
          <div className="metric-card">
            <h4>Rating Distribution</h4>
            <div className="rating-chart">
              {conversationMetrics.ratingDistribution.slice().reverse().map(item => {
                const percentage = conversationMetrics.totalCount > 0 
                  ? ((item.count / conversationMetrics.ratedCount) * 100).toFixed(0)
                  : '0';
                return (
                  <div 
                    key={item.rating} 
                    className={`rating-bar-container ${
                      selectedConversationMetrics?.ratingBucket === item.rating ? 'highlighted' : ''
                    }`}
                  >
                    <div className="rating-bar-header">
                      <span className="rating-label">
                        Rating {item.rating}
                        {item.count > 0 && (
                          <span className="rating-count"> · {item.count} conversation{item.count !== 1 ? 's' : ''}</span>
                        )}
                      </span>
                      <span className="rating-percentage">{percentage}%</span>
                    </div>
                    <div className="rating-bar-wrapper">
                      <div 
                        className="rating-bar" 
                        data-rating={item.rating}
                        style={{ 
                          width: `${percentage}%` 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="rating-summary">
                <span className="summary-label">Total Rated Conversations</span>
                <span className="summary-value">{conversationMetrics.ratedCount}</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <h4>Rated vs Unrated</h4>
            <CircularProgress
              percentage={(conversationMetrics.ratedCount / conversationMetrics.totalCount) * 100}
              ratedCount={conversationMetrics.ratedCount}
              unratedCount={conversationMetrics.unratedCount}
              label="Rated"
            />
          </div>

          <div className="metric-card">
            <h4>Overall Average Rating</h4>
            <div className="average-rating">
              {conversationMetrics.overallAverage !== null ? (
                <>
                  <span className="rating-value">{conversationMetrics.overallAverage.toFixed(2)}</span>
                  <span className="rating-scale">/ 10</span>
                </>
              ) : (
                <span className="no-data">No ratings available</span>
              )}
            </div>
          </div>
        </div>

        <div className="metrics-section">
          <h3>Q&A Metrics</h3>
          
          <div className="metric-card">
            <h4>Q&A Rating Distribution</h4>
            <div className="rating-chart">
              {qaMetrics.ratingDistribution.slice().reverse().map(item => {
                const percentage = qaMetrics.totalCount > 0 
                  ? ((item.count / qaMetrics.ratedCount) * 100).toFixed(0)
                  : '0';
                return (
                  <div key={item.rating} className="rating-bar-container">
                    <div className="rating-bar-header">
                      <span className="rating-label">
                        Rating {item.rating}
                        {item.count > 0 && (
                          <span className="rating-count"> · {item.count} Q&A{item.count !== 1 ? 's' : ''}</span>
                        )}
                      </span>
                      <span className="rating-percentage">{percentage}%</span>
                    </div>
                    <div className="rating-bar-wrapper">
                      <div 
                        className="rating-bar qa-rating-bar" 
                        data-rating={item.rating}
                        style={{ 
                          width: `${percentage}%` 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="rating-summary">
                <span className="summary-label">Total Rated Q&As</span>
                <span className="summary-value">{qaMetrics.ratedCount}</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <h4>Q&A Rated vs Unrated</h4>
            <CircularProgress
              percentage={(qaMetrics.ratedCount / qaMetrics.totalCount) * 100}
              ratedCount={qaMetrics.ratedCount}
              unratedCount={qaMetrics.unratedCount}
              label="Rated"
            />
          </div>

          <div className="metric-card">
            <h4>Q&A Overall Average Rating</h4>
            <div className="average-rating">
              {qaMetrics.overallAverage !== null ? (
                <>
                  <span className="rating-value">{qaMetrics.overallAverage.toFixed(2)}</span>
                  <span className="rating-scale">/ 10</span>
                </>
              ) : (
                <span className="no-data">No ratings available</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}