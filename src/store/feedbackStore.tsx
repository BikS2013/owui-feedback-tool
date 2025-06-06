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
  loadFromFile: (file: File) => Promise<void>;
  clearData: () => void;
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
      
      // Check if there's data in local storage
      const storedData = localStorage.getItem('athena-feedback-data');
      if (storedData) {
        try {
          const data: FeedbackEntry[] = JSON.parse(storedData);
          setRawData(data);
          
          // Process the data
          const { conversations: convMap, qaPairs: qaList } = processRawFeedbackData(data);
          setConversations(Array.from(convMap.values()));
          setQAPairs(qaList);
          return;
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
          localStorage.removeItem('athena-feedback-data');
        }
      }
      
      // Fall back to loading default file
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

  const clearData = () => {
    setRawData([]);
    setConversations([]);
    setQAPairs([]);
    setError(null);
    // Clear local storage
    localStorage.removeItem('athena-feedback-data');
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
      const data: FeedbackEntry[] = JSON.parse(text);
      
      // Validate that it's an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid file format: expected an array of feedback entries');
      }
      
      // Save to local storage
      localStorage.setItem('athena-feedback-data', JSON.stringify(data));
      
      setRawData(data);
      
      // Process the data
      const { conversations: convMap, qaPairs: qaList } = processRawFeedbackData(data);
      setConversations(Array.from(convMap.values()));
      setQAPairs(qaList);
      
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load file');
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
    loadFromFile,
    clearData,
    filters,
    setFilters
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}