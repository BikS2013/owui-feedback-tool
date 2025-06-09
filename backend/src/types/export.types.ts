export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  userId?: string;
  model?: string;
  modelName?: string;
  parentId?: string | null;
  childrenIds?: string[];
  annotation?: {
    rating?: number;
    details?: {
      rating?: number;
    };
  };
  feedbackId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  qaPairCount: number;
  totalRatings: number;
  averageRating: number | null;
  modelsUsed: string[];
}

export interface QAPair {
  id: string;
  conversationId: string;
  question: Message;
  answer: Message;
  rating: number | null;
  sentiment: 1 | -1 | null;
  comment: string | null;
  timestamp: number;
}

export interface ExportRequest {
  conversation: Conversation;
  qaPairs: QAPair[];
  format: 'pdf' | 'html';
}

export interface ExportQAPairRequest {
  qaPair: {
    question: Message;
    answer: Message;
    rating?: number | null;
    comment?: string | null;
  };
  conversationId: string;
  format: 'pdf' | 'html';
}