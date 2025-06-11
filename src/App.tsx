import { useState, useMemo } from 'react';
import { ConversationList } from './components/ConversationList/ConversationList';
import { ConversationDetail } from './components/ConversationDetail/ConversationDetail';
import { AnalyticsDashboard } from './components/AnalyticsDashboard/AnalyticsDashboard';
import { ResizablePanel } from './components/ResizablePanel/ResizablePanel';
import { DataNotification } from './components/DataNotification/DataNotification';
import { FeedbackProvider, useFeedbackStore } from './store/feedbackStore';
import { ThemeProvider } from './store/themeStore';
import { 
  filterConversationsByDate, 
  filterConversationsByRating, 
  searchInConversations,
  filterQAPairsByRating,
  searchInQAPairs,
  filterConversationsByModel,
  getAllModelsFromConversations
} from './utils/dataProcessor';
import './App.css';

function AppContent() {
  const { 
    conversations, 
    qaPairs, 
    isLoading, 
    error,
    filters,
    setFilters,
    viewMode
  } = useFeedbackStore();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Get all available models
  const availableModels = useMemo(() => {
    return getAllModelsFromConversations(conversations);
  }, [conversations]);

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];
    
    // Apply date filter
    filtered = filterConversationsByDate(
      filtered,
      filters.dateRange.start,
      filters.dateRange.end
    );
    
    // Apply model filter
    filtered = filterConversationsByModel(filtered, filters.modelFilter);
    
    // Apply rating filter if at conversation level
    if (filters.filterLevel === 'conversation') {
      filtered = filterConversationsByRating(
        filtered,
        filters.ratingFilter.min,
        filters.ratingFilter.max,
        filters.ratingFilter.includeUnrated
      );
    }
    
    // Apply search
    filtered = searchInConversations(filtered, filters.searchTerm);
    
    return filtered;
  }, [conversations, filters]);

  // Get filtered Q&A pairs for selected conversation
  const filteredQAPairs = useMemo(() => {
    if (!selectedConversationId) return [];
    
    let filtered = qaPairs.filter(qa => qa.conversationId === selectedConversationId);
    
    // Apply rating filter if at Q&A level
    if (filters.filterLevel === 'qa') {
      filtered = filterQAPairsByRating(
        filtered,
        filters.ratingFilter.min,
        filters.ratingFilter.max,
        filters.ratingFilter.includeUnrated
      );
    }
    
    // Apply search if at Q&A level
    if (filters.filterLevel === 'qa' && filters.searchTerm) {
      filtered = searchInQAPairs(filtered, filters.searchTerm);
    }
    
    return filtered;
  }, [qaPairs, selectedConversationId, filters]);

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  const handleSearchChange = (term: string) => {
    setFilters({
      ...filters,
      searchTerm: term
    });
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <p>Loading feedback data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <p>Error loading data: {error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <DataNotification />
      <ResizablePanel storageKey="conversation-list-width">
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          searchTerm={filters.searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={setFilters}
          availableModels={availableModels}
        />
      </ResizablePanel>
      <main className="main-content">
        {viewMode === 'details' ? (
          <ConversationDetail
            conversation={selectedConversation}
            qaPairs={filteredQAPairs}
          />
        ) : (
          <AnalyticsDashboard
            conversations={filteredConversations}
            qaPairs={qaPairs}
            selectedConversationId={selectedConversationId}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <AppContent />
      </FeedbackProvider>
    </ThemeProvider>
  );
}

export default App;
