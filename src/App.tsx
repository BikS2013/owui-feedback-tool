import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConversationList } from './components/ConversationList/ConversationList';
import { ConversationDetail } from './components/ConversationDetail/ConversationDetail';
import { ResizablePanel } from './components/ResizablePanel/ResizablePanel';
import { DataNotification } from './components/DataNotification/DataNotification';
import { RenderingOverlay } from './components/RenderingOverlay';
import { FeedbackProvider, useFeedbackStore } from './store/feedbackStore';
import { ThemeProvider } from './store/themeStore';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { OAuthCallback } from './pages/OAuthCallback';
import { 
  searchInConversations
} from './utils/dataProcessor';
import { applyJavaScriptFilter } from './utils/javascriptFilter';
import { convertLangGraphThreadsToConversations } from './utils/langgraphConverter';
import { executeRenderScript, RenderResult } from './utils/javascriptRender';
import { applyStaticFilters } from './utils/staticFilters';
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
  const [renderingOverlay, setRenderingOverlay] = useState<{
    isVisible: boolean;
    result: RenderResult | null;
  }>({
    isVisible: false,
    result: null
  });
  
  // Track the last executed render script timestamp
  const [lastExecutedTimestamp, setLastExecutedTimestamp] = useState<number | undefined>(undefined);

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
    }
    
    // Apply search term filter
    filtered = searchInConversations(filtered, filters.searchTerm);
    
    // Apply static filters (date, model, rating)
    const hasStaticFilters = filters.dateRange || filters.modelFilter || filters.ratingFilter;
    if (hasStaticFilters) {
      console.log('🔧 [App] Applying static filters');
      const beforeCount = filtered.length;
      filtered = applyStaticFilters(filtered, filters);
      console.log(`   Static filters: ${beforeCount} -> ${filtered.length} conversations`);
    }
    
    const filterEndTime = performance.now();
    console.log(`✅ [App] Filtered to ${filtered.length} conversations in ${(filterEndTime - filterStartTime).toFixed(2)}ms`);
    
    return filtered;
  }, [conversations, filters, dataSource, langGraphThreads]);

  // Get Q&A pairs for selected conversation
  const filteredQAPairs = useMemo(() => {
    if (!selectedConversationId) return [];
    
    // Just return Q&A pairs for the selected conversation
    return qaPairs.filter(qa => qa.conversationId === selectedConversationId);
  }, [qaPairs, selectedConversationId]);

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [conversations, selectedConversationId]);

  // Show overlay when timestamp changes (re-applying same filter)
  useEffect(() => {
    console.log('🔄 [App] Timestamp effect triggered:', {
      hasRenderScript: !!filters.customRenderScript,
      timestamp: filters.renderScriptTimestamp,
      hasResult: !!renderingOverlay.result,
      isVisible: renderingOverlay.isVisible
    });
    
    if (filters.customRenderScript && filters.renderScriptTimestamp && renderingOverlay.result) {
      // If we already have a result but overlay is hidden, show it again
      if (!renderingOverlay.isVisible) {
        console.log('👁️ [App] Re-showing overlay due to timestamp change');
        setRenderingOverlay(prev => ({ ...prev, isVisible: true }));
      }
    }
  }, [filters.renderScriptTimestamp]);

  // Execute render script only when timestamp changes (not when data loads)
  useEffect(() => {
    if (filters.customRenderScript && filters.renderScriptTimestamp) {
      // Only execute if this is a new timestamp
      if (filters.renderScriptTimestamp !== lastExecutedTimestamp) {
        console.log('🎨 [App] Executing render script due to new timestamp');
        
        // Wait a bit to ensure data is loaded
        const timer = setTimeout(() => {
          if (langGraphThreads.length > 0) {
            // Execute render script with appropriate data
            const threadsToRender = dataSource === 'agent' && langGraphThreads.length > 0
              ? (filters.customJavaScriptFilter 
                  ? applyJavaScriptFilter(langGraphThreads, filters.customJavaScriptFilter)
                  : langGraphThreads)
              : langGraphThreads;
            
            const result = executeRenderScript(threadsToRender, filters.customRenderScript || '');
            
            setRenderingOverlay({
              isVisible: true,
              result
            });
            
            setLastExecutedTimestamp(filters.renderScriptTimestamp);
          }
        }, 100);
        
        return () => clearTimeout(timer);
      }
    } else if (!filters.customRenderScript) {
      // Clear overlay if no render script
      setRenderingOverlay({
        isVisible: false,
        result: null
      });
      setLastExecutedTimestamp(undefined);
    }
  }, [filters.customRenderScript, filters.renderScriptTimestamp]);

  const handleSearchChange = (term: string) => {
    setFilters({
      ...filters,
      searchTerm: term
    });
  };
  
  // Function to manually trigger render script execution
  const executeRenderScriptManually = () => {
    if (filters.customRenderScript) {
      console.log('🎨 [App] Manually executing render script');
      
      // Execute render script with current data
      const threadsToRender = dataSource === 'agent' && langGraphThreads.length > 0
        ? (filters.customJavaScriptFilter 
            ? applyJavaScriptFilter(langGraphThreads, filters.customJavaScriptFilter)
            : langGraphThreads)
        : langGraphThreads;
      
      const result = executeRenderScript(threadsToRender, filters.customRenderScript || '');
      
      setRenderingOverlay({
        isVisible: true,
        result
      });
    }
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
          hasRenderingOutput={!!filters.customRenderScript}
          onShowOutput={executeRenderScriptManually}
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
      {renderingOverlay.result && (
        <RenderingOverlay
          isVisible={renderingOverlay.isVisible}
          content={renderingOverlay.result.content}
          contentType={renderingOverlay.result.type}
          error={renderingOverlay.result.error}
          onClose={() => {
            // Keep the result, just hide the overlay
            setRenderingOverlay(prev => ({ ...prev, isVisible: false }));
            // Don't clear the render script, just hide the overlay
          }}
          position="full"
        />
      )}
    </div>
  );
}

function MainApp() {
  return (
    <FeedbackProvider>
      <AppContent />
    </FeedbackProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin-nbg" element={<OAuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
