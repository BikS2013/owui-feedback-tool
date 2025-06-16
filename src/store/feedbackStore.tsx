import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FeedbackEntry } from '../types/feedback';
import { Conversation, QAPair, FilterOptions } from '../types/conversation';
import { processRawData } from '../utils/dataProcessor';
import { LangGraphThread } from '../types/langgraph';
import { storageUtils } from '../utils/storageUtils';

type ViewMode = 'details' | 'analytics';

interface FeedbackStore {
  rawData: FeedbackEntry[];
  conversations: Conversation[];
  qaPairs: QAPair[];
  langGraphThreads: LangGraphThread[]; // Original LangGraph data
  isLoading: boolean;
  loadingSource: 'file' | 'agent' | null;
  error: string | null;
  dataExpiresAt: number | null; // Unix timestamp when data expires
  loadData: () => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  loadFromAgentThreads: (agentName: string, page?: number, fromDate?: Date, toDate?: Date, isJump?: boolean) => Promise<void>;
  clearData: () => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedAnalyticsModel: string | null;
  setSelectedAnalyticsModel: (model: string | null) => void;
  dataFormat: string | null;
  dataWarnings: string[];
  dataSource: 'file' | 'agent' | null;
  agentPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentAgent: string | null;
  agentDateRange: {
    fromDate?: Date;
    toDate?: Date;
  } | null;
}

const FeedbackContext = createContext<FeedbackStore | undefined>(undefined);

export function useFeedbackStore() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedbackStore must be used within FeedbackProvider');
  }
  return context;
}

interface FeedbackProviderProps {
  children: ReactNode;
}


const STORAGE_KEY = 'owui-feedback-data';
const VIEW_MODE_KEY = 'owui-view-mode';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [rawData, setRawData] = useState<FeedbackEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [langGraphThreads, setLangGraphThreads] = useState<LangGraphThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<'file' | 'agent' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataExpiresAt, setDataExpiresAt] = useState<number | null>(null);
  const [dataFormat, setDataFormat] = useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  // Initialize dataSource from localStorage immediately
  const [dataSource, setDataSource] = useState<'file' | 'agent' | null>(() => {
    const agentMetadataStr = localStorage.getItem(STORAGE_KEY + '-agent-metadata');
    if (agentMetadataStr) {
      try {
        const agentMetadata = JSON.parse(agentMetadataStr);
        return agentMetadata.dataSource;
      } catch (e) {
        console.error('Error parsing agent metadata for initial state:', e);
      }
    }
    return null;
  });
  const [agentPagination, setAgentPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(() => {
    const agentMetadataStr = localStorage.getItem(STORAGE_KEY + '-agent-metadata');
    if (agentMetadataStr) {
      try {
        const agentMetadata = JSON.parse(agentMetadataStr);
        return agentMetadata.currentAgent;
      } catch (e) {
        console.error('Error parsing agent metadata for currentAgent:', e);
      }
    }
    return null;
  });
  const [agentDateRange, setAgentDateRange] = useState<{
    fromDate?: Date;
    toDate?: Date;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved view mode from localStorage
    const savedViewMode = localStorage.getItem(VIEW_MODE_KEY);
    return (savedViewMode as ViewMode) || 'details';
  });
  const [selectedAnalyticsModel, setSelectedAnalyticsModel] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    customJavaScriptFilter: undefined,
    customRenderScript: undefined,
    naturalLanguageQuery: undefined,
    renderScriptTimestamp: undefined
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if there's agent metadata in local storage
      const agentMetadataStr = localStorage.getItem(STORAGE_KEY + '-agent-metadata');
      if (agentMetadataStr) {
        try {
          const agentMetadata = JSON.parse(agentMetadataStr);
          console.log('Restoring agent metadata:', agentMetadata);
          
          // Restore agent state
          setDataSource(agentMetadata.dataSource);
          setCurrentAgent(agentMetadata.currentAgent);
          setAgentDateRange(agentMetadata.agentDateRange);
          setAgentPagination(agentMetadata.agentPagination);
          setDataFormat('agent');
          
          console.log(`Previously loaded from agent: ${agentMetadata.currentAgent}`);
        } catch (parseError) {
          console.error('Error parsing agent metadata:', parseError);
          localStorage.removeItem(STORAGE_KEY + '-agent-metadata');
        }
      } else {
        // Check if there's file metadata in local storage
        const metadataStr = localStorage.getItem(STORAGE_KEY + '-metadata');
        if (metadataStr) {
          try {
            const metadata = JSON.parse(metadataStr);
            
            // Check if metadata has expired
            const now = Date.now();
            if (now < metadata.expiresAt) {
              // Show info about previously loaded file
              console.log(`Previously loaded: ${metadata.fileName} (${(metadata.fileSize / 1024 / 1024).toFixed(2)}MB)`);
              console.log(`Format: ${metadata.format}, Conversations: ${metadata.conversationCount}`);
              setDataSource('file');
              setDataFormat(metadata.format);
            } else {
              // Metadata has expired, remove it
              console.log('Stored metadata has expired, removing from local storage');
              localStorage.removeItem(STORAGE_KEY + '-metadata');
            }
          } catch (parseError) {
            console.error('Error parsing metadata:', parseError);
            localStorage.removeItem(STORAGE_KEY + '-metadata');
          }
        }
      }
      
      // No valid data in local storage, start with empty state
      // Don't load the default file anymore
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    console.log('🧹 [FeedbackStore] clearData called');
    const startTime = performance.now();
    
    setRawData([]);
    setConversations([]);
    setQAPairs([]);
    setLangGraphThreads([]);
    setError(null);
    setDataExpiresAt(null);
    setDataFormat(null);
    setDataWarnings([]);
    setDataSource(null);
    setAgentPagination(null);
    setCurrentAgent(null);
    setAgentDateRange(null);
    // Clear local storage metadata
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '-metadata');
    localStorage.removeItem(STORAGE_KEY + '-agent-metadata');
    // Reset filters to default
    setFilters({
      searchTerm: '',
      customJavaScriptFilter: undefined,
      customRenderScript: undefined,
      naturalLanguageQuery: undefined,
      renderScriptTimestamp: undefined
    });
    
    const endTime = performance.now();
    console.log(`✅ [FeedbackStore] clearData completed in ${(endTime - startTime).toFixed(2)}ms`);
  };

  const loadFromFile = async (file: File) => {
    console.log(`📁 [FeedbackStore] loadFromFile called - ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setLoadingSource('file');
      setError(null);
      
      // Read the file
      const text = await file.text();
      const rawData = JSON.parse(text);
      
      // Validate that it's an array
      if (!Array.isArray(rawData)) {
        throw new Error('Invalid file format: expected an array of entries');
      }
      
      // Process the data - this will handle format detection and conversion
      console.log(`🔄 [FeedbackStore] Processing ${rawData.length} raw data entries...`);
      const processStartTime = performance.now();
      const { conversations: convMap, qaPairs: qaList, format, warnings } = processRawData(rawData);
      const processEndTime = performance.now();
      console.log(`✅ [FeedbackStore] Data processing completed in ${(processEndTime - processStartTime).toFixed(2)}ms`);
      console.log(`   - Format: ${format}`);
      console.log(`   - Conversations: ${convMap.size}`);
      console.log(`   - Q/A Pairs: ${qaList.length}`);
      console.log(`   - Warnings: ${warnings.length}`);
      
      // For chat format, we need to extract the processed feedback entries
      // For feedback format, they're already in the correct format
      let feedbackEntries: FeedbackEntry[] = [];
      if (format === 'feedback') {
        feedbackEntries = rawData as FeedbackEntry[];
      } else {
        // For chat format, we store the converted data
        // The conversion already happened in processRawData
        // We'll store the synthetic feedback entries
        feedbackEntries = Array.from(convMap.values()).flatMap(conv => conv.feedbackEntries);
      }
      
      // Don't save large files to localStorage - just keep in memory
      // Store only metadata about the loaded file
      const metadata = {
        fileName: file.name,
        fileSize: file.size,
        loadedAt: Date.now(),
        format: format,
        conversationCount: convMap.size,
        expiresAt: Date.now() + TWO_WEEKS_MS
      };
      
      try {
        localStorage.setItem(STORAGE_KEY + '-metadata', JSON.stringify(metadata));
        // Clear any agent metadata when loading from file
        localStorage.removeItem(STORAGE_KEY + '-agent-metadata');
      } catch (e) {
        console.warn('Could not save file metadata to localStorage:', e);
      }
      
      setRawData(feedbackEntries);
      setDataExpiresAt(metadata.expiresAt);
      setDataFormat(format);
      setDataWarnings(warnings);
      setDataSource('file'); // Set data source to file
      
      // Clear LangGraph data when loading OWUI data
      setLangGraphThreads([]);
      
      console.log('🔄 [FeedbackStore] Setting state for file data...');
      const stateStartTime = performance.now();
      setConversations(Array.from(convMap.values()));
      setQAPairs(qaList);
      const stateEndTime = performance.now();
      console.log(`✅ [FeedbackStore] State updated in ${(stateEndTime - stateStartTime).toFixed(2)}ms`);
      
    } catch (err) {
      console.error('❌ [FeedbackStore] Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
      setLoadingSource(null);
      const endTime = performance.now();
      console.log(`🏁 [FeedbackStore] loadFromFile total time: ${(endTime - startTime).toFixed(2)}ms`);
    }
  };

  const loadFromAgentThreads = async (agentName: string, page: number = 1, fromDate?: Date, toDate?: Date, isJump: boolean = false) => {
    console.log(`🤖 [FeedbackStore] loadFromAgentThreads called - ${agentName}, page ${page}`);
    const startTime = performance.now();
    
    try {
      setIsLoading(true);
      setLoadingSource('agent');
      setError(null);
      
      const apiUrl = await storageUtils.getApiUrl();
      const limit = 50; // Show 50 threads per page
      let url = `${apiUrl}/agent/threads?agentName=${encodeURIComponent(agentName)}&page=${page}&limit=${limit}`;
      
      // Add date parameters if provided
      if (fromDate) {
        url += `&fromDate=${fromDate.toISOString()}`;
      }
      if (toDate) {
        url += `&toDate=${toDate.toISOString()}`;
      }
      
      console.log('🚀 [FeedbackStore] Fetching agent threads from:', url);
      const fetchStartTime = performance.now();
      const response = await fetch(url);
      const fetchEndTime = performance.now();
      console.log(`✅ [FeedbackStore] API fetch completed in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms`);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to fetch agent threads: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Agent threads data received:', data);
      
      if (!data.success || !data.data || !data.data.threads) {
        throw new Error('Invalid response format');
      }
      
      // Store pagination info and date range
      setAgentPagination(data.data.pagination);
      setCurrentAgent(agentName);
      setAgentDateRange({ fromDate, toDate });
      
      // Store original LangGraph threads without transformation
      const threads: LangGraphThread[] = data.data.threads;
      console.log(`📊 [FeedbackStore] Processing ${threads.length} threads...`);
      
      // If it's a new page (not page 1), append to existing threads
      // BUT if it's a jump (like going to last page), replace instead of append
      const isNewAgent = currentAgent !== agentName;
      const startWithExisting = page > 1 && !isNewAgent && !isJump;
      console.log(`   - New agent: ${isNewAgent}`);
      console.log(`   - Start with existing: ${startWithExisting}`);
      
      // Create lightweight conversation objects for display in the list
      const convStartTime = performance.now();
      const conversationsForDisplay: Conversation[] = threads.map(thread => {
        // Extract basic info for list display
        const messageCount = thread.values?.messages?.length || 0;
        const firstMessage = thread.values?.messages?.[0];
        
        // Create a title from the first message or thread ID
        let title = `Thread ${thread.thread_id.slice(0, 8)}...`;
        if (firstMessage) {
          const content = typeof firstMessage.content === 'string' 
            ? firstMessage.content 
            : firstMessage.text || JSON.stringify(firstMessage.content);
          title = content.length > 50 
            ? content.substring(0, 50) + '...'
            : content;
        }
        
        return {
          id: thread.thread_id,
          title: title,
          userId: thread.metadata?.user_id || 'agent-user',
          createdAt: new Date(thread.created_at).getTime(),
          updatedAt: new Date(thread.updated_at || thread.created_at).getTime(),
          messages: [], // Empty for list display
          averageRating: null,
          totalRatings: 0,
          feedbackEntries: [],
          modelsUsed: [], // Could extract from messages if needed
          qaPairCount: Math.floor(messageCount / 2)
        };
      });
      const convEndTime = performance.now();
      console.log(`✅ [FeedbackStore] Created ${conversationsForDisplay.length} display conversations in ${(convEndTime - convStartTime).toFixed(2)}ms`);
      
      console.log('🔄 [FeedbackStore] Updating state...');
      const stateStartTime = performance.now();
      setDataExpiresAt(null);
      setDataFormat('agent');
      setDataWarnings([]);
      setDataSource('agent');
      
      // Save agent metadata to localStorage
      const agentMetadata = {
        dataSource: 'agent',
        currentAgent: agentName,
        agentDateRange: { fromDate, toDate },
        agentPagination: data.data.pagination,
        loadedAt: Date.now()
      };
      
      try {
        localStorage.setItem(STORAGE_KEY + '-agent-metadata', JSON.stringify(agentMetadata));
      } catch (e) {
        console.warn('Could not save agent metadata to localStorage:', e);
      }
      
      // Update LangGraph threads and conversations
      if (startWithExisting) {
        // Append new threads to existing ones
        console.log('   - Appending to existing data');
        setLangGraphThreads(prev => {
          const newLength = prev.length + threads.length;
          console.log(`   - LangGraph threads: ${prev.length} + ${threads.length} = ${newLength}`);
          return [...prev, ...threads];
        });
        setConversations(prev => {
          const newLength = prev.length + conversationsForDisplay.length;
          console.log(`   - Conversations: ${prev.length} + ${conversationsForDisplay.length} = ${newLength}`);
          return [...prev, ...conversationsForDisplay];
        });
      } else {
        // Replace all threads (new agent or first page)
        console.log('   - Replacing all data');
        console.log(`   - Setting ${threads.length} LangGraph threads`);
        console.log(`   - Setting ${conversationsForDisplay.length} conversations`);
        setLangGraphThreads(threads);
        setConversations(conversationsForDisplay);
      }
      const stateEndTime = performance.now();
      console.log(`✅ [FeedbackStore] State updated in ${(stateEndTime - stateStartTime).toFixed(2)}ms`);
      
    } catch (err) {
      console.error('❌ [FeedbackStore] Error loading agent threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent threads');
    } finally {
      setIsLoading(false);
      setLoadingSource(null);
      const endTime = performance.now();
      console.log(`🏁 [FeedbackStore] loadFromAgentThreads total time: ${(endTime - startTime).toFixed(2)}ms`);
    }
  };

  // Load data from local storage on startup if available and not expired
  useEffect(() => {
    loadData();
  }, []);


  const value: FeedbackStore = {
    rawData,
    conversations,
    qaPairs,
    langGraphThreads,
    isLoading,
    loadingSource,
    error,
    dataExpiresAt,
    dataFormat,
    dataWarnings,
    dataSource,
    agentPagination,
    currentAgent,
    agentDateRange,
    loadData,
    loadFromFile,
    loadFromAgentThreads,
    clearData,
    filters,
    setFilters,
    viewMode,
    setViewMode,
    selectedAnalyticsModel,
    setSelectedAnalyticsModel
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}