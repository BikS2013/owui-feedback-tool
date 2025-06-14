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
  searchTerm: string;
  // Natural Language filters (script-based)
  customJavaScriptFilter?: string;
  customRenderScript?: string;
  naturalLanguageQuery?: string;
  renderScriptTimestamp?: number;
  // Static filters
  dateRange?: {
    start: Date | null;
    end: Date | null;
  };
  modelFilter?: string[];
  ratingFilter?: {
    min: number;
    max: number;
    includeUnrated: boolean;
  };
}