export interface FeedbackEntry {
  id: string;
  user_id: string;
  version: number;
  type: string;
  data: FeedbackData;
  meta: FeedbackMeta;
  snapshot: FeedbackSnapshot;
  created_at: number;
  updated_at: number;
}

export interface FeedbackData {
  rating: 1 | -1;
  model_id: string;
  sibling_model_ids: null;
  reason: string;
  comment: string;
  tags: string[];
  details: {
    rating: number | null;
  };
}

export interface FeedbackMeta {
  model_id: string;
  message_id: string;
  message_index: number;
  chat_id: string;
  base_models: {
    [key: string]: null;
  };
}

export interface FeedbackSnapshot {
  chat: ChatSnapshot;
}

export interface ChatSnapshot {
  id: string;
  user_id: string;
  title: string;
  chat: ChatData;
  updated_at: number;
  created_at: number;
  share_id: null;
  archived: boolean;
  pinned: boolean;
  meta: Record<string, unknown>;
  folder_id: null;
}

export interface ChatData {
  id: string;
  title: string;
  models: string[];
  params: Record<string, unknown>;
  history: ChatHistory;
  messages: Message[];
  tags: string[];
  timestamp: number;
  files: unknown[];
}

export interface ChatHistory {
  messages: Record<string, Message>;
  currentId: string;
}

export interface Message {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  models?: string[];
  model?: string;
  modelName?: string;
  modelIdx?: number;
  userContext?: null;
  lastSentence?: string;
  done?: boolean;
  annotation?: MessageAnnotation;
  feedbackId?: string;
  userId?: string;
}

export interface MessageAnnotation {
  rating: 1 | -1;
  tags: string[];
  reason?: string;
  comment?: string;
  details?: {
    rating: number | null;
  };
}