import { storageUtils } from '../utils/storageUtils';
import { AuthService } from './auth.service';

export class ApiService {
  private static apiUrlPromise: Promise<string> | null = null;
  private static initialized = false;

  static async getApiBaseUrl(): Promise<string> {
    if (!this.apiUrlPromise) {
      this.apiUrlPromise = storageUtils.getApiUrl();
    }
    return this.apiUrlPromise;
  }

  static initialize() {
    if (!this.initialized) {
      // Setup auth interceptor
      AuthService.setupInterceptor();
      this.initialized = true;
    }
  }

  static async exportConversationPDF(conversation: any, qaPairs: any[], metadata?: any): Promise<Blob> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/export/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation,
        qaPairs,
        format: 'pdf',
        metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  static async exportQAPairPDF(
    qaPair: { question: any; answer: any; rating?: number | null; comment?: string | null },
    conversationId: string,
    metadata?: any
  ): Promise<Blob> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/export/qa-pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qaPair,
        conversationId,
        format: 'pdf',
        metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    // For health check, we need to determine if the URL already includes the path
    const baseUrl = await this.getApiBaseUrl();
    let healthUrl: string;
    
    // If the URL ends with /api, go up one level for health check
    if (baseUrl.endsWith('/api')) {
      healthUrl = `${baseUrl.substring(0, baseUrl.length - 4)}/health`;
    } else {
      // Otherwise, assume health is at the same level
      healthUrl = `${baseUrl}/health`;
    }
    
    const response = await fetch(healthUrl);
    
    if (!response.ok) {
      throw new Error('Backend service is not available');
    }

    return await response.json();
  }

  static async getThreadRuns(threadId: string, agentName: string, page: number = 1, limit: number = 50): Promise<{
    success: boolean;
    threadId: string;
    data: {
      runs: Array<{
        run_id: string;
        thread_id: string;
        created_at?: string;
        updated_at?: string;
        status?: string;
        metadata?: any;
        config?: any;
        checkpoint?: any;
        parent_checkpoint?: any;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/agent/thread/${threadId}/runs?agentName=${encodeURIComponent(agentName)}&page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch thread runs: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getThreadCheckpoints(threadId: string, agentName: string, page: number = 1, limit: number = 50): Promise<{
    success: boolean;
    threadId: string;
    data: {
      checkpoints: Array<{
        thread_id: string;
        checkpoint_id: string;
        run_id?: string;
        parent_checkpoint_id?: string;
        checkpoint: any;
        metadata?: any;
        checkpoint_ns?: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }> {
    const apiUrl = await this.getApiBaseUrl();
    const response = await fetch(`${apiUrl}/agent/thread/${threadId}/checkpoints?agentName=${encodeURIComponent(agentName)}&page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch thread checkpoints: ${response.statusText}`);
    }

    return await response.json();
  }
}