import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FeedbackEntry } from '../types/feedback';
import { Conversation, QAPair, FilterOptions } from '../types/conversation';
import { processRawData } from '../utils/dataProcessor';

type ViewMode = 'details' | 'analytics';

interface FeedbackStore {
  rawData: FeedbackEntry[];
  conversations: Conversation[];
  qaPairs: QAPair[];
  isLoading: boolean;
  error: string | null;
  dataExpiresAt: number | null; // Unix timestamp when data expires
  loadData: () => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  clearData: () => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedAnalyticsModel: string | null;
  setSelectedAnalyticsModel: (model: string | null) => void;
  dataFormat: string | null;
  dataWarnings: string[];
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

interface StoredFeedbackData {
  data: FeedbackEntry[];
  expiresAt: number; // Unix timestamp
}

const STORAGE_KEY = 'owui-feedback-data';
const VIEW_MODE_KEY = 'owui-view-mode';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [rawData, setRawData] = useState<FeedbackEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataExpiresAt, setDataExpiresAt] = useState<number | null>(null);
  const [dataFormat, setDataFormat] = useState<string | null>(null);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
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
      
      // Check if there's data in local storage
      const storedDataStr = localStorage.getItem(STORAGE_KEY);
      if (storedDataStr) {
        try {
          const storedData: StoredFeedbackData = JSON.parse(storedDataStr);
          
          // Check if data has expired
          const now = Date.now();
          if (now < storedData.expiresAt) {
            // Data is still valid
            setRawData(storedData.data);
            setDataExpiresAt(storedData.expiresAt);
            
            // Process the data
            const { conversations: convMap, qaPairs: qaList, format, warnings } = processRawData(storedData.data);
            setConversations(Array.from(convMap.values()));
            setQAPairs(qaList);
            setDataFormat(format);
            setDataWarnings(warnings);
            return;
          } else {
            // Data has expired, remove it
            console.log('Stored data has expired, removing from local storage');
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
          localStorage.removeItem(STORAGE_KEY);
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
    // Clear local storage
    localStorage.removeItem(STORAGE_KEY);
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
      
      // Save to local storage with expiration
      const storedData: StoredFeedbackData = {
        data: feedbackEntries,
        expiresAt: Date.now() + TWO_WEEKS_MS
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
      
      setRawData(feedbackEntries);
      setDataExpiresAt(storedData.expiresAt);
      setDataFormat(format);
      setDataWarnings(warnings);
      
      setConversations(Array.from(convMap.values()));
      setQAPairs(qaList);
      
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from local storage on startup if available and not expired
  useEffect(() => {
    loadData();
  }, []);

  // Save viewMode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const value: FeedbackStore = {
    rawData,
    conversations,
    qaPairs,
    isLoading,
    error,
    dataExpiresAt,
    dataFormat,
    dataWarnings,
    loadData,
    loadFromFile,
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