// LangGraph-specific types that preserve the original API structure

export interface LangGraphThread {
  thread_id: string;
  thread_ts?: string;
  channel_id?: string;
  configurable?: any;
  created_at: string;
  updated_at?: string;
  metadata?: {
    user_id?: string;
    [key: string]: any;
  };
  checkpoint?: any;
  parent_checkpoint?: any;
  values?: {
    messages?: LangGraphMessage[];
    retrieved_docs?: LangGraphDocument[];
    [key: string]: any;
  };
  status?: string;
  config?: any;
  interrupts?: any;
}

export interface LangGraphMessage {
  id?: string;
  type: 'human' | 'ai' | string;
  content: string | { text?: string; [key: string]: any };
  text?: string; // Alternative content field
  timestamp?: string | number;
  response_metadata?: {
    model_name?: string;
    [key: string]: any;
  };
  model?: string;
  [key: string]: any;
}

export interface LangGraphDocument {
  id?: string;
  page_content?: string;
  metadata?: {
    source?: string;
    title?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface LangGraphPaginatedResponse {
  threads: LangGraphThread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}