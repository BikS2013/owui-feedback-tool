import axios, { AxiosInstance } from 'axios';
import type { ThreadsApiResponse, CheckpointsApiResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

interface GetThreadsParams {
  fromDate: string;
  toDate: string;
  agentName?: string;
  page: number;
  pageSize: number;
}

export class ThreadsApiClient {
  private client: AxiosInstance;
  
  constructor() {
    const baseURL = process.env.API_BASE_URL;
    if (!baseURL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async getThreads(params: GetThreadsParams): Promise<ThreadsApiResponse> {
    try {
      const response = await this.client.get('/api/agent/threads', {
        params: {
          agentName: params.agentName,
          fromDate: params.fromDate,
          toDate: params.toDate,
          page: params.page,
          limit: params.pageSize,
        },
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch threads', { error, params });
      throw new Error(`Failed to fetch threads: ${error}`);
    }
  }
  
  async getThreadCheckpoints(
    threadId: string,
    agentName: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<CheckpointsApiResponse> {
    try {
      const response = await this.client.get(`/api/agent/thread/${threadId}/checkpoints`, {
        params: {
          agentName,
          page,
          limit: pageSize,
        },
      });
      
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch checkpoints', { error, threadId, agentName });
      throw new Error(`Failed to fetch checkpoints: ${error}`);
    }
  }
}