export interface Thread {
  thread_id: string;
  thread_ts: string;
  channel_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  checkpoint?: any;
  parent_checkpoint?: any;
  values?: {
    messages?: Array<{
      id: string;
      name?: string | null;
      type: 'human' | 'ai' | 'assistant' | 'user';
      content: string;
      example?: boolean;
      additional_kwargs?: any;
      response_metadata?: any;
    }>;
    queries?: string[];
    [key: string]: any;
  };
  status?: string;
  config?: any;
}

export interface ThreadsApiResponse {
  threads: Thread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Checkpoint {
  thread_id: string;
  checkpoint_id: string;
  run_id?: string;
  parent_checkpoint_id?: string;
  checkpoint: {
    channel_values?: {
      messages?: Array<{
        type: 'human' | 'ai' | 'assistant' | 'user';
        content: string;
        id?: string;
      }>;
      [key: string]: any;
    };
    versions?: any;
  };
  metadata?: any;
  checkpoint_ns?: string;
}

export interface CheckpointsApiResponse {
  checkpoints: Checkpoint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExtractedQuestion {
  conversationId: string;
  conversationTimestamp: string;
  questionOrder: number;
  totalQuestionsInThread: number;
  questionText: string;
}