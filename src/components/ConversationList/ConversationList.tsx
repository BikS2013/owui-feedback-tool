import { useState } from 'react';
import { Filter, Settings } from 'lucide-react';
import { Conversation, FilterOptions } from '../../types/conversation';
import { format } from 'date-fns';
import { FilterPanel } from '../FilterPanel/FilterPanel';
import { DataControls } from '../DataControls/DataControls';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { ColorSchemeToggle } from '../ColorSchemeToggle/ColorSchemeToggle';
import { ListItem } from '../ListItem/ListItem';
import { List } from '../List/List';
import { LogoHeader } from '../LogoHeader/LogoHeader';
import { SettingsModal } from '../SettingsModal/SettingsModal';
import { Pagination } from '../Pagination/Pagination';
import { useFeedbackStore } from '../../store/feedbackStore';
import { useTheme } from '../../store/themeStore';
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
  const [showSettings, setShowSettings] = useState(false);
  const { colorScheme } = useTheme();
  const { dataSource, agentPagination, currentAgent, agentDateRange, loadFromAgentThreads, isLoading, langGraphThreads } = useFeedbackStore();
  
  // Get the current LangGraph thread if selected
  const currentThread = dataSource === 'agent' && selectedId 
    ? langGraphThreads.find(thread => thread.thread_id === selectedId)
    : null;
  
  // Calculate total Q&A pairs
  const totalQAPairs = conversations.reduce((sum, conv) => sum + conv.qaPairCount, 0);
  
  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'var(--text-tertiary)';
    if (rating >= 7) return 'var(--accent-green)';
    if (rating >= 5) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const topRightControls = (
    <>
      <DataControls />
      <button 
        className={`filter-btn ${filters.naturalLanguageQuery ? 'filter-active' : ''}`} 
        onClick={() => setIsFilterPanelOpen(true)}
        title={filters.naturalLanguageQuery ? `Natural Language Filter: "${filters.naturalLanguageQuery}"` : 'Open filters'}
      >
        <Filter size={16} />
        {filters.naturalLanguageQuery && <span className="filter-indicator" />}
      </button>
    </>
  );

  const conversationHeader = (
    <LogoHeader
      logoSrc={colorScheme === 'green' ? "/nbg-logo-only.svg" : "/nbg-tech-hub-logo.svg"}
      logoAlt="NBG Technology Hub"
      title={<h2>Conversations</h2>}
      subtitle={<span className="counts-text">{conversations.length} conversations, {totalQAPairs} Q&As</span>}
      topRightControls={topRightControls}
      bottomRightControls={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="settings-button"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <ColorSchemeToggle />
          <ThemeToggle />
        </div>
      }
    />
  );

  const emptyState = (
    <div className="no-conversations">
      <p>No conversations available</p>
      <p className="no-conversations-hint">
        {dataSource === 'agent' 
          ? "Connect to an agent to load threads" 
          : "Upload a JSON file to get started"}
      </p>
    </div>
  );

  const renderConversationItem = (conv: Conversation) => (
    <ListItem
      id={conv.id}
      selected={selectedId === conv.id}
      onClick={() => onSelect(conv.id)}
      header={
        <>
          <div className="conversation-id">
            {conv.id.substring(0, 8)}...{conv.id.substring(conv.id.length - 4)}
          </div>
          <span className="timestamp">
            {format(new Date(conv.updatedAt), 'yyyy-MM-dd')}
            {' '}
            {format(new Date(conv.updatedAt), 'hh:mm a')}
          </span>
        </>
      }
    >
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
    </ListItem>
  );

  const handlePageChange = (page: number, isJump?: boolean) => {
    if (currentAgent) {
      loadFromAgentThreads(currentAgent, page, agentDateRange?.fromDate, agentDateRange?.toDate, isJump);
    }
  };

  return (
    <>
      <div className="conversation-list-wrapper">
        <List
          items={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(conv) => conv.id}
          header={conversationHeader}
          searchable={true}
          searchValue={searchTerm}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search conversations..."
          emptyState={emptyState}
          className="conversation-list"
        />
        {dataSource === 'agent' && agentPagination && agentPagination.totalPages > 1 && (
          <Pagination
            currentPage={agentPagination.page}
            totalPages={agentPagination.totalPages}
            totalRows={agentPagination.total}
            pageSize={agentPagination.limit}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            displayedRows={conversations.length}
          />
        )}
      </div>
      <FilterPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        availableModels={availableModels}
        currentThread={currentThread}
      />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}