import { FeedbackEntry, Message } from '../types/feedback';
import { v4 as uuidv4 } from 'uuid';

export interface ChatExportEntry {
  id: string;
  user_id: string;
  title: string;
  chat: {
    id: string;
    title: string;
    models: string[];
    params: Record<string, unknown>;
    history: {
      messages: Record<string, Message>;
    };
  };
  updated_at?: number;
  created_at?: number;
  share_id?: null;
  archived?: boolean;
  pinned?: boolean;
  meta?: Record<string, unknown>;
  folder_id?: null;
}

export function convertChatFormatToFeedbackFormat(chatEntries: ChatExportEntry[]): FeedbackEntry[] {
  const feedbackEntries: FeedbackEntry[] = [];
  
  chatEntries.forEach(chatEntry => {
    // Extract messages and find the earliest and latest timestamps
    const messages = Object.values(chatEntry.chat.history.messages);
    const timestamps = messages.map(m => m.timestamp).filter(t => t !== undefined);
    const earliestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : Date.now() / 1000;
    const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now() / 1000;
    
    // Create a synthetic feedback entry for this chat
    // We create one feedback entry per chat to preserve the conversation
    const syntheticFeedbackEntry: FeedbackEntry = {
      id: uuidv4(), // Generate a new ID for the feedback entry
      user_id: chatEntry.user_id,
      version: 0,
      type: 'rating',
      data: {
        rating: 1, // Neutral/positive since we don't have actual ratings
        model_id: chatEntry.chat.models[0] || 'unknown',
        sibling_model_ids: null,
        reason: '',
        comment: 'Imported from chat export (no feedback data available)',
        tags: [],
        details: {
          rating: null // No rating available
        }
      },
      meta: {
        model_id: chatEntry.chat.models[0] || 'unknown',
        message_id: '', // No specific message rated
        message_index: -1,
        chat_id: chatEntry.id,
        base_models: {}
      },
      snapshot: {
        chat: {
          id: chatEntry.id,
          user_id: chatEntry.user_id,
          title: chatEntry.title,
          chat: {
            id: chatEntry.chat.id || '',
            title: chatEntry.chat.title,
            models: chatEntry.chat.models,
            params: chatEntry.chat.params,
            history: {
              messages: chatEntry.chat.history.messages,
              currentId: '' // No current ID available in chat export format
            },
            messages: messages, // Convert to array format
            tags: [],
            timestamp: earliestTimestamp,
            files: []
          },
          updated_at: chatEntry.updated_at || latestTimestamp,
          created_at: chatEntry.created_at || earliestTimestamp,
          share_id: chatEntry.share_id || null,
          archived: chatEntry.archived || false,
          pinned: chatEntry.pinned || false,
          meta: chatEntry.meta || {},
          folder_id: chatEntry.folder_id || null
        }
      },
      created_at: chatEntry.created_at || earliestTimestamp,
      updated_at: chatEntry.updated_at || latestTimestamp
    };
    
    feedbackEntries.push(syntheticFeedbackEntry);
  });
  
  return feedbackEntries;
}

export function getChatFormatInfo(chatEntries: ChatExportEntry[]): {
  totalChats: number;
  totalMessages: number;
  modelsUsed: string[];
  dateRange: { start: Date; end: Date } | null;
} {
  let totalMessages = 0;
  const modelsSet = new Set<string>();
  let earliestTimestamp: number | null = null;
  let latestTimestamp: number | null = null;
  
  chatEntries.forEach(entry => {
    const messages = Object.values(entry.chat.history.messages);
    totalMessages += messages.length;
    
    // Collect models
    entry.chat.models.forEach(model => modelsSet.add(model));
    messages.forEach(msg => {
      if (msg.model) modelsSet.add(msg.model);
      if (msg.modelName) modelsSet.add(msg.modelName);
    });
    
    // Track timestamps
    messages.forEach(msg => {
      if (msg.timestamp) {
        if (!earliestTimestamp || msg.timestamp < earliestTimestamp) {
          earliestTimestamp = msg.timestamp;
        }
        if (!latestTimestamp || msg.timestamp > latestTimestamp) {
          latestTimestamp = msg.timestamp;
        }
      }
    });
  });
  
  return {
    totalChats: chatEntries.length,
    totalMessages,
    modelsUsed: Array.from(modelsSet).sort(),
    dateRange: earliestTimestamp && latestTimestamp ? {
      start: new Date(earliestTimestamp * 1000),
      end: new Date(latestTimestamp * 1000)
    } : null
  };
}