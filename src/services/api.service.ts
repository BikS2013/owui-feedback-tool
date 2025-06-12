import { storageUtils } from '../utils/storageUtils';

export class ApiService {
  static getApiBaseUrl(): string {
    return storageUtils.getApiUrl();
  }
  static async exportConversationPDF(conversation: any, qaPairs: any[]): Promise<Blob> {
    const response = await fetch(`${this.getApiBaseUrl()}/export/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation,
        qaPairs,
        format: 'pdf'
      })
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  static async exportQAPairPDF(
    qaPair: { question: any; answer: any; rating?: number | null; comment?: string | null },
    conversationId: string
  ): Promise<Blob> {
    const response = await fetch(`${this.getApiBaseUrl()}/export/qa-pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qaPair,
        conversationId,
        format: 'pdf'
      })
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }

  static async checkHealth(): Promise<{ status: string; timestamp: string }> {
    // For health check, we need to determine if the URL already includes the path
    const baseUrl = this.getApiBaseUrl();
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
}