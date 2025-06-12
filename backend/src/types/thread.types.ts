export interface Thread {
  thread_id: string;
  created_at?: Date;
  updated_at?: Date;
  metadata?: any;
  status?: string;
  config?: any;
  values?: any;
  interrupts?: any;
}

export interface ThreadQueryParams {
  agentName: string;
  page?: number;
  limit?: number;
}

export interface ThreadPaginatedResponse {
  threads: Thread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}