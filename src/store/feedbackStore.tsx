import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FeedbackEntry } from '../types/feedback';
import { Conversation, QAPair, FilterOptions } from '../types/conversation';
import { processRawFeedbackData } from '../utils/dataProcessor';

interface FeedbackStore {
  rawData: FeedbackEntry[];
  conversations: Conversation[];
  qaPairs: QAPair[];
  isLoading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
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

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const [rawData, setRawData] = useState<FeedbackEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [qaPairs, setQAPairs] = useState<QAPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      
      const response = await fetch('/feedback-history-export.json');
      if (!response.ok) {
        throw new Error('Failed to load feedback data');
      }
      
      const data: FeedbackEntry[] = await response.json();
      setRawData(data);
      
      // Process the data
      const { conversations: convMap, qaPairs: qaList } = processRawFeedbackData(data);
      setConversations(Array.from(convMap.values()));
      setQAPairs(qaList);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const value: FeedbackStore = {
    rawData,
    conversations,
    qaPairs,
    isLoading,
    error,
    loadData,
    filters,
    setFilters
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}