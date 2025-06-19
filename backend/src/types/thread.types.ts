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

export interface Run {
  run_id: string;
  thread_id: string;
  created_at?: Date;
  updated_at?: Date;
  status?: string;
  metadata?: any;
  config?: any;
  checkpoint?: any;
  parent_checkpoint?: any;
  assistant_id?: string;
  multitask_strategy?: string;
}

export interface RunsPaginatedResponse {
  runs: Run[];
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
  checkpoint: any;
  metadata?: any;
  checkpoint_ns?: string;
}

export interface CheckpointsPaginatedResponse {
  checkpoints: Checkpoint[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}