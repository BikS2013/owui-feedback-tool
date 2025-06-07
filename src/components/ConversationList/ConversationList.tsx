import { useState } from 'react';
import { Search, Filter, BarChart2, MessageSquare } from 'lucide-react';
import { Conversation, FilterOptions } from '../../types/conversation';
import { format } from 'date-fns';
import { FilterPanel } from '../FilterPanel/FilterPanel';
import { DataControls } from '../DataControls/DataControls';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { useFeedbackStore } from '../../store/feedbackStore';
import './ConversationList.css';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableModels: string[];
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  availableModels
}: ConversationListProps) {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const { viewMode, setViewMode } = useFeedbackStore();
  
  // Calculate total Q&A pairs
  const totalQAPairs = conversations.reduce((sum, conv) => sum + conv.qaPairCount, 0);
  
  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'var(--text-tertiary)';
    if (rating >= 7) return 'var(--accent-green)';
    if (rating >= 5) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };


  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <div className="conversation-list-header-top">
          <img src="/nbg-tech-hub-logo.svg" alt="NBG Technology Hub" className="nbg-logo" />
          <div className="header-controls">
            <div className="view-toggle">
              <button 
                className={`view-toggle-btn ${viewMode === 'details' ? 'active' : ''}`}
                onClick={() => setViewMode('details')}
                title="Conversation Details"
              >
                <MessageSquare size={16} />
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'analytics' ? 'active' : ''}`}
                onClick={() => setViewMode('analytics')}
                title="Analytics Dashboard"
              >
                <BarChart2 size={16} />
              </button>
            </div>
            <DataControls />
            <button className="filter-btn" onClick={() => setIsFilterPanelOpen(true)}>
              <Filter size={16} />
            </button>
          </div>
        </div>
        <div className="conversation-counts">
          <h2>Conversations</h2>
          <span className="counts-text">{conversations.length} conversations, {totalQAPairs} Q&As</span>
          <ThemeToggle />
        </div>
      </div>
      
      <div className="search-container">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="conversations">
        {conversations.length === 0 ? (
          <div className="no-conversations">
            <p>No conversations available</p>
            <p className="no-conversations-hint">Upload a JSON file to get started</p>
          </div>
        ) : (
          conversations.map(conv => (
          <div
            key={conv.id}
            className={`conversation-item ${selectedId === conv.id ? 'selected' : ''}`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="conversation-item-header">
              <div className="conversation-id">
                {conv.id.substring(0, 8)}...{conv.id.substring(conv.id.length - 4)}
              </div>
              <span className="timestamp">
                {format(new Date(conv.updatedAt * 1000), 'yyyy-MM-dd')}
                {' '}
                {format(new Date(conv.updatedAt * 1000), 'HH:mm a')}
              </span>
            </div>

            <div className="conversation-info">
              <div className="user-info">
                <span className="user-icon">👤</span>
                <span className="user-label">Unknown User</span>
              </div>
              
              {conv.modelsUsed && conv.modelsUsed.length > 0 && (
                <div className="models-info">
                  <span className="models-label">Models: {conv.modelsUsed.join(', ')}</span>
                </div>
              )}
              
              <div className="stats-info">
                <span className="stat-item">Q&As: {conv.qaPairCount}</span>
                <span className="stat-item">Rated: {conv.totalRatings}</span>
                {conv.averageRating !== null && (
                  <span className="stat-item">
                    <span 
                      className="confidence-dot"
                      style={{ backgroundColor: getRatingColor(conv.averageRating) }}
                    />
                    Avg: {conv.averageRating.toFixed(1)}/10
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
        )}
      </div>
      
      <FilterPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        availableModels={availableModels}
      />
    </div>
  );
}