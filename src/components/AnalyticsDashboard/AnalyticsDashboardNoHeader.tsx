import { useMemo } from 'react';
import { Conversation, QAPair } from '../../types/conversation';
import { useFeedbackStore } from '../../store/feedbackStore';
import { CircularProgress } from '../CircularProgress/CircularProgress';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  conversations: Conversation[];
  qaPairs: QAPair[];
  selectedConversationId: string | null;
  allQaPairs?: QAPair[];
}

interface RatingDistribution {
  rating: number;
  count: number;
  conversationIds: string[];
}

export function AnalyticsDashboardNoHeader({ 
  conversations, 
  qaPairs,
  selectedConversationId 
}: AnalyticsDashboardProps) {
  const { dataFormat } = useFeedbackStore();
  
  // Check if we have rating data
  const hasRatingData = dataFormat !== 'chat' && dataFormat !== 'agent';



  // Use conversations directly without model filtering
  const filteredConversations = conversations;

  // Use QA pairs directly without model filtering
  const filteredQAPairs = qaPairs || [];

  // Calculate conversation-based metrics
  const conversationMetrics = useMemo(() => {
    const rated = filteredConversations.filter(c => c.averageRating !== null && c.averageRating !== undefined);
    const unrated = filteredConversations.filter(c => c.averageRating === null || c.averageRating === undefined);
    
    // Create rating distribution
    const distribution: RatingDistribution[] = [];
    for (let i = 1; i <= 10; i++) {
      distribution.push({
        rating: i,
        count: 0,
        conversationIds: []
      });
    }
    
    // Count conversations by their average rating (rounded)
    rated.forEach(conv => {
      if (conv.averageRating !== null) {
        const roundedRating = Math.round(conv.averageRating);
        const index = roundedRating - 1;
        if (index >= 0 && index < 10) {
          distribution[index].count++;
          distribution[index].conversationIds.push(conv.id);
        }
      }
    });
    
    // Calculate overall average
    const totalRating = rated.reduce((sum, c) => sum + (c.averageRating || 0), 0);
    const overallAverage = rated.length > 0 ? totalRating / rated.length : null;
    
    return {
      totalCount: filteredConversations.length,
      ratedCount: rated.length,
      unratedCount: unrated.length,
      ratingDistribution: distribution,
      overallAverage
    };
  }, [filteredConversations, hasRatingData]);

  // Calculate Q&A-based metrics
  const qaMetrics = useMemo(() => {
    const rated = filteredQAPairs.filter(qa => qa.rating !== null && qa.rating !== undefined);
    const unrated = filteredQAPairs.filter(qa => qa.rating === null || qa.rating === undefined);
    
    // Create rating distribution
    const distribution: RatingDistribution[] = [];
    for (let i = 1; i <= 10; i++) {
      distribution.push({
        rating: i,
        count: 0,
        conversationIds: []
      });
    }
    
    // Count Q&A pairs by rating
    rated.forEach(qa => {
      if (qa.rating !== null && qa.rating >= 1 && qa.rating <= 10) {
        const index = qa.rating - 1;
        distribution[index].count++;
        distribution[index].conversationIds.push(qa.conversationId);
      }
    });
    
    // Calculate overall average
    const totalRating = rated.reduce((sum, qa) => sum + (qa.rating || 0), 0);
    const overallAverage = rated.length > 0 ? totalRating / rated.length : null;
    
    return {
      totalCount: filteredQAPairs.length,
      ratedCount: rated.length,
      unratedCount: unrated.length,
      ratingDistribution: distribution,
      overallAverage
    };
  }, [filteredQAPairs, hasRatingData]);


  return (
    <div className="analytics-dashboard">
      <div className={`analytics-content ${!hasRatingData ? 'no-rating-data' : ''}`}>
        <div className="metrics-section">
          <h3>Conversation Metrics</h3>
          
          <div className="metric-card average-rating-card">
            <h4>Overall Average Rating</h4>
            <div className="average-rating-content">
              {conversationMetrics.overallAverage !== null ? (
                <div className="average-rating-display">
                  <span className="rating-value">{conversationMetrics.overallAverage.toFixed(2)}</span>
                  <span className="rating-scale">/ 10</span>
                </div>
              ) : (
                <span className="no-data">No ratings available</span>
              )}
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
            <h4>Rating Distribution</h4>
            <div className="rating-chart">
              {conversationMetrics.ratingDistribution.slice().reverse().map(item => {
                const percentage = conversationMetrics.ratedCount > 0 
                  ? ((item.count / conversationMetrics.ratedCount) * 100).toFixed(0)
                  : '0';
                return (
                  <div 
                    key={item.rating} 
                    className={`rating-bar-container ${selectedConversationId && item.conversationIds.includes(selectedConversationId) ? 'highlighted' : ''}`}
                  >
                    <div className="rating-bar-header">
                      <span className="rating-label">Rating {item.rating} · {item.count} conversations</span>
                      <span className="rating-percentage">{percentage}%</span>
                    </div>
                    <div className="rating-bar-wrapper">
                      <div 
                        className="rating-bar" 
                        data-rating={item.rating}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="metrics-section">
          <h3>Q&A Metrics</h3>
          
          <div className="metric-card average-rating-card">
            <h4>Q&A Overall Average Rating</h4>
            <div className="average-rating-content">
              {qaMetrics.overallAverage !== null ? (
                <div className="average-rating-display">
                  <span className="rating-value">{qaMetrics.overallAverage.toFixed(2)}</span>
                  <span className="rating-scale">/ 10</span>
                </div>
              ) : (
                <span className="no-data">No ratings available</span>
              )}
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
            <h4>Q&A Rating Distribution</h4>
            <div className="rating-chart">
              {qaMetrics.ratingDistribution.slice().reverse().map(item => {
                const percentage = qaMetrics.ratedCount > 0 
                  ? ((item.count / qaMetrics.ratedCount) * 100).toFixed(0)
                  : '0';
                const isHighlighted = selectedConversationId && 
                  item.conversationIds.includes(selectedConversationId);
                return (
                  <div 
                    key={item.rating} 
                    className={`rating-bar-container ${isHighlighted ? 'highlighted' : ''}`}
                  >
                    <div className="rating-bar-header">
                      <span className="rating-label">Rating {item.rating} · {item.count} Q&As</span>
                      <span className="rating-percentage">{percentage}%</span>
                    </div>
                    <div className="rating-bar-wrapper">
                      <div 
                        className="rating-bar qa-rating-bar" 
                        data-rating={item.rating}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}