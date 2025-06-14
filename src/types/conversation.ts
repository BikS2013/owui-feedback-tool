import { Message, FeedbackEntry } from './feedback';

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  averageRating: number | null;
  totalRatings: number;
  feedbackEntries: FeedbackEntry[];
  modelsUsed?: string[];
  qaPairCount: number;
}

export interface QAPair {
  id: string;
  conversationId: string;
  question: Message;
  answer: Message;
  rating: number | null;
  sentiment: 1 | -1 | null;
  comment: string;
  feedbackId: string | null;
  timestamp: number;
}

export interface FilterOptions {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  ratingFilter: {
    min: number;
    max: number;
    includeUnrated: boolean;
  };
  searchTerm: string;
  filterLevel: 'conversation' | 'qa';
  modelFilter: string[];
  customJavaScriptFilter?: string;
  naturalLanguageQuery?: string;
}