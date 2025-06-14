import { useState, useMemo } from 'react';
import { ConversationList } from './components/ConversationList/ConversationList';
import { ConversationDetail } from './components/ConversationDetail/ConversationDetail';
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
import { applyJavaScriptFilter } from './utils/javascriptFilter';
import { convertLangGraphThreadsToConversations } from './utils/langgraphConverter';
import './App.css';

function AppContent() {
  console.log('🎯 [App] AppContent rendering');
  let feedbackStore;
  try {
    feedbackStore = useFeedbackStore();
  } catch (error) {
    // Handle hot module replacement issues
    console.warn('FeedbackStore not available yet, this may be due to hot reload');
    return <div>Loading...</div>;
  }
  
  const { 
    conversations, 
    qaPairs, 
    langGraphThreads,
    isLoading,
    loadingSource, 
    error,
    filters,
    setFilters,
    dataSource
  } = feedbackStore;
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Get all available models
  const availableModels = useMemo(() => {
    return getAllModelsFromConversations(conversations);
  }, [conversations]);

  // Apply filters to conversations
  const filteredConversations = useMemo(() => {
    console.log(`🎭 [App] Filtering conversations - dataSource: ${dataSource}, hasJSFilter: ${!!filters.customJavaScriptFilter}`);
    const filterStartTime = performance.now();
    
    let filtered = [...conversations];
    
    // If we have a JavaScript filter and we're viewing LangGraph data, apply it at the thread level
    if (dataSource === 'agent' && filters.customJavaScriptFilter && langGraphThreads.length > 0) {
      console.log('🚀 [App] Applying JavaScript filter to LangGraph threads');
      
      // Apply JavaScript filter to threads
      const filteredThreads = applyJavaScriptFilter(langGraphThreads, filters.customJavaScriptFilter);
      
      // Convert filtered threads to conversations
      const { conversations: filteredConvs } = convertLangGraphThreadsToConversations(filteredThreads);
      filtered = filteredConvs;
      
      console.log(`   Filtered ${langGraphThreads.length} threads to ${filteredThreads.length}, converted to ${filtered.length} conversations`);
    } else {
      // Apply standard filters
      
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
    }
    
    const filterEndTime = performance.now();
    console.log(`✅ [App] Filtered to ${filtered.length} conversations in ${(filterEndTime - filterStartTime).toFixed(2)}ms`);
    
    return filtered;
  }, [conversations, filters, dataSource, langGraphThreads]);

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

  if (error) {
    return (
      <div className="app-error">
        <p>Error loading data: {error}</p>
      </div>
    );
  }

  return (
    <div className={`app ${isLoading ? 'app-loading-blur' : ''}`}>
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
        <ConversationDetail
          conversation={selectedConversation}
          qaPairs={filteredQAPairs}
        />
      </main>
      {isLoading && (
        <div className="app-loading-overlay">
          <div className="app-loading-message">
            <h3>Loading Data</h3>
            <p>
              {loadingSource === 'agent' 
                ? 'Fetching conversations from the API...' 
                : loadingSource === 'file'
                ? 'Processing file data...'
                : 'Loading data...'}
            </p>
          </div>
        </div>
      )}
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
