import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FeedbackEntry, Message } from '../types/feedback';
import { Conversation, QAPair, FilterOptions } from '../types/conversation';
import { processRawData } from '../utils/dataProcessor';

type ViewMode = 'details' | 'analytics';

interface FeedbackStore {
  rawData: FeedbackEntry[];
  conversations: Conversation[];
  qaPairs: QAPair[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<'file' | 'agent' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataExpiresAt, setDataExpiresAt] = useState<number | null>(null);
  const [dataFormat, setDataFormat] = useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<'file' | 'agent' | null>(null);
  const [agentPagination, setAgentPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
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
    dateRange: {
      start: null,
      end: null
    },
    ratingFilter: {
      min: 1,
      max: 10,
      includeUnrated: true
    },
    searchTerm: '',
    filterLevel: 'conversation',
    modelFilter: []
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if there's metadata in local storage
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
    setRawData([]);
    setConversations([]);
    setQAPairs([]);
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
    // Reset filters to default
    setFilters({
      dateRange: {
        start: null,
        end: null
      },
      ratingFilter: {
        min: 1,
        max: 10,
        includeUnrated: true
      },
      searchTerm: '',
      filterLevel: 'conversation',
      modelFilter: []
    });
  };

  const loadFromFile = async (file: File) => {
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
      const { conversations: convMap, qaPairs: qaList, format, warnings } = processRawData(rawData);
      
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
      } catch (e) {
        console.warn('Could not save file metadata to localStorage:', e);
      }
      
      setRawData(feedbackEntries);
      setDataExpiresAt(metadata.expiresAt);
      setDataFormat(format);
      setDataWarnings(warnings);
      setDataSource('file'); // Set data source to file
      
      setConversations(Array.from(convMap.values()));
      setQAPairs(qaList);
      
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
      setLoadingSource(null);
    }
  };

  const loadFromAgentThreads = async (agentName: string, page: number = 1, fromDate?: Date, toDate?: Date, isJump: boolean = false) => {
    try {
      setIsLoading(true);
      setLoadingSource('agent');
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const limit = 50; // Show 50 threads per page
      let url = `${apiUrl}/agent/threads?agentName=${encodeURIComponent(agentName)}&page=${page}&limit=${limit}`;
      
      // Add date parameters if provided
      if (fromDate) {
        url += `&fromDate=${fromDate.toISOString()}`;
      }
      if (toDate) {
        url += `&toDate=${toDate.toISOString()}`;
      }
      
      console.log('🚀 Fetching agent threads from:', url);
      const response = await fetch(url);
      
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
      
      // Convert agent threads to conversation format
      const threads = data.data.threads;
      const conversations: Conversation[] = [];
      const qaPairs: QAPair[] = [];
      
      // If it's a new page (not page 1), append to existing conversations
      // BUT if it's a jump (like going to last page), replace instead of append
      const isNewAgent = currentAgent !== agentName;
      const startWithExisting = page > 1 && !isNewAgent && !isJump;
      
      threads.forEach((thread: any) => {
        // Extract messages from thread values
        const messages: Message[] = [];
        if (thread.values && thread.values.messages) {
          thread.values.messages.forEach((msg: any, index: number) => {
            // Extract model name from response_metadata if available
            const modelName = msg.response_metadata?.model_name || msg.model || 'unknown';
            
            // For timestamps, check if message has its own timestamp field first
            // Otherwise use thread timestamps
            let messageTimestamp: number;
            if (msg.timestamp) {
              // If timestamp exists, it might be ISO string or milliseconds
              messageTimestamp = typeof msg.timestamp === 'string' 
                ? new Date(msg.timestamp).getTime()
                : msg.timestamp;
            } else {
              // For human messages, use created_at; for AI messages, use updated_at
              messageTimestamp = msg.type === 'human' 
                ? new Date(thread.created_at).getTime()
                : new Date(thread.updated_at || thread.created_at).getTime();
            }
            
            messages.push({
              id: msg.id || `${thread.thread_id}-${messages.length}`,
              parentId: null,
              childrenIds: [],
              role: msg.type === 'human' ? 'user' : 'assistant',
              content: typeof msg.content === 'string' ? msg.content : 
                       typeof msg.text === 'string' ? msg.text :
                       typeof msg.content === 'object' && msg.content?.text ? msg.content.text :
                       JSON.stringify(msg.content || msg.text || ''),
              timestamp: messageTimestamp,
              model: modelName,
              modelName: modelName // Add modelName for display
            });
          });
        }
        
        // Create conversation from thread
        // Use the first message content as title if available, otherwise use thread ID
        let title = `Thread ${thread.thread_id.slice(0, 8)}...`;
        if (messages.length > 0 && messages[0].content) {
          // Truncate the first message to create a meaningful title
          const firstMessage = messages[0].content;
          title = firstMessage.length > 50 
            ? firstMessage.substring(0, 50) + '...'
            : firstMessage;
        }
        
        // Parse timestamps with error handling
        let createdAtTimestamp: number;
        let updatedAtTimestamp: number;
        
        try {
          createdAtTimestamp = new Date(thread.created_at).getTime();
          updatedAtTimestamp = new Date(thread.updated_at || thread.created_at).getTime();
          
          // Validate timestamps
          if (isNaN(createdAtTimestamp) || createdAtTimestamp < 0) {
            console.warn('Invalid created_at timestamp:', thread.created_at);
            createdAtTimestamp = Date.now();
          }
          if (isNaN(updatedAtTimestamp) || updatedAtTimestamp < 0) {
            console.warn('Invalid updated_at timestamp:', thread.updated_at);
            updatedAtTimestamp = createdAtTimestamp;
          }
        } catch (error) {
          console.error('Error parsing timestamps:', error);
          createdAtTimestamp = Date.now();
          updatedAtTimestamp = Date.now();
        }
        
        const conversation: Conversation = {
          id: thread.thread_id,
          title: title,
          userId: thread.metadata?.user_id || 'agent-user',
          createdAt: createdAtTimestamp,
          updatedAt: updatedAtTimestamp,
          messages: messages,
          averageRating: null,
          totalRatings: 0,
          feedbackEntries: [],
          modelsUsed: Array.from(new Set(messages.filter(m => m.model && m.model !== 'unknown').map(m => m.model!))),
          qaPairCount: Math.floor(messages.length / 2)
        };
        
        // Create Q/A pairs from messages
        for (let i = 0; i < messages.length - 1; i += 2) {
          if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
            qaPairs.push({
              id: `${thread.thread_id}-qa-${i}`,
              conversationId: conversation.id,
              question: messages[i],
              answer: messages[i + 1],
              rating: null,
              sentiment: null,
              comment: '',
              feedbackId: null,
              timestamp: messages[i + 1].timestamp
            });
          }
        }
        
        conversations.push(conversation);
      });
      
      setRawData([]);
      setDataExpiresAt(null);
      setDataFormat('agent');
      setDataWarnings([]);
      setDataSource('agent');
      
      // Update conversations and QA pairs
      if (startWithExisting) {
        // Append new conversations to existing ones
        setConversations(prev => [...prev, ...conversations]);
        setQAPairs(prev => [...prev, ...qaPairs]);
      } else {
        // Replace all conversations (new agent or first page)
        setConversations(conversations);
        setQAPairs(qaPairs);
      }
      
    } catch (err) {
      console.error('Error loading agent threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent threads');
    } finally {
      setIsLoading(false);
      setLoadingSource(null);
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