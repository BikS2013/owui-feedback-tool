import { FeedbackEntry, Message } from '../types/feedback';
import { Conversation, QAPair } from '../types/conversation';
import { detectDataFormat, validateDataIntegrity } from './formatDetector';
import { convertChatFormatToFeedbackFormat, ChatExportEntry } from './chatFormatConverter';

export function processRawData(rawData: any[]): {
  conversations: Map<string, Conversation>;
  qaPairs: QAPair[];
  format: string;
  warnings: string[];
} {
  const detectionResult = detectDataFormat(rawData);
  const validationResult = validateDataIntegrity(rawData, detectionResult.format);
  
  let feedbackEntries: FeedbackEntry[];
  const warnings: string[] = [...validationResult.warnings];
  
  if (detectionResult.format === 'chat') {
    // Convert chat format to feedback format
    feedbackEntries = convertChatFormatToFeedbackFormat(rawData as ChatExportEntry[]);
    warnings.push('Data imported from chat export format. No ratings or feedback data available.');
  } else if (detectionResult.format === 'feedback') {
    feedbackEntries = rawData as FeedbackEntry[];
  } else {
    throw new Error(`Unknown data format: ${detectionResult.details}`);
  }
  
  const result = processRawFeedbackData(feedbackEntries);
  
  return {
    ...result,
    format: detectionResult.format,
    warnings
  };
}

export function processRawFeedbackData(feedbackEntries: FeedbackEntry[]): {
  conversations: Map<string, Conversation>;
  qaPairs: QAPair[];
} {
  const conversationsMap = new Map<string, Conversation>();
  const allQAPairs: QAPair[] = [];

  feedbackEntries.forEach(entry => {
    const chatSnapshot = entry.snapshot.chat;
    const chatId = chatSnapshot.id;
    
    // Get or create conversation
    let conversation = conversationsMap.get(chatId);
    if (!conversation) {
      // Convert timestamps from seconds to milliseconds if needed
      let createdAt = chatSnapshot.created_at;
      let updatedAt = chatSnapshot.updated_at;
      
      // Check if timestamps are in seconds (Unix timestamp) instead of milliseconds
      // Unix timestamps in seconds are typically 10 digits, in milliseconds 13 digits
      if (createdAt && createdAt < 10000000000) {
        createdAt = createdAt * 1000;
      }
      if (updatedAt && updatedAt < 10000000000) {
        updatedAt = updatedAt * 1000;
      }
      
      conversation = {
        id: chatId,
        title: chatSnapshot.title || 'Untitled Conversation',
        userId: chatSnapshot.user_id,
        createdAt: createdAt,
        updatedAt: updatedAt,
        messages: [],
        averageRating: null,
        totalRatings: 0,
        feedbackEntries: [],
        modelsUsed: [],
        qaPairCount: 0
      };
      conversationsMap.set(chatId, conversation);
    }
    
    // Add feedback entry to conversation
    conversation.feedbackEntries.push(entry);
    
    // Process messages - use array format if available, otherwise convert from dict
    const messages = chatSnapshot.chat.messages || 
      Object.values(chatSnapshot.chat.history.messages);
    
    // Update conversation messages if we have more
    if (messages.length > conversation.messages.length) {
      conversation.messages = messages;
    }
    
    // Extract Q&A pair for this feedback
    const ratedMessageId = entry.meta.message_id;
    const ratedMessage = findMessageById(messages, ratedMessageId);
    
    if (ratedMessage && ratedMessage.role === 'assistant') {
      const parentMessage = findMessageById(messages, ratedMessage.parentId);
      
      if (parentMessage && parentMessage.role === 'user') {
        const qaPair: QAPair = {
          id: `${chatId}-${ratedMessageId}`,
          conversationId: chatId,
          question: parentMessage,
          answer: ratedMessage,
          rating: entry.data.details?.rating || null,
          sentiment: entry.data.rating,
          comment: entry.data.comment,
          feedbackId: entry.id,
          timestamp: ratedMessage.timestamp
        };
        
        allQAPairs.push(qaPair);
      }
    }
  });
  
  // Calculate average ratings and collect models for conversations
  conversationsMap.forEach(conversation => {
    const ratings = conversation.feedbackEntries
      .map(e => e.data.details?.rating)
      .filter(r => r !== null && r !== undefined) as number[];
    
    if (ratings.length > 0) {
      conversation.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      conversation.totalRatings = ratings.length;
    }
    
    // Collect unique models used in the conversation
    const modelsSet = new Set<string>();
    conversation.messages.forEach(msg => {
      if (msg.model) {
        modelsSet.add(msg.model);
      }
    });
    conversation.modelsUsed = Array.from(modelsSet);
    
    // Count Q&A pairs (number of assistant messages)
    conversation.qaPairCount = conversation.messages.filter(m => m.role === 'assistant').length;
  });

  return {
    conversations: conversationsMap,
    qaPairs: allQAPairs
  };
}

function findMessageById(messages: Message[], id: string | null): Message | undefined {
  if (!id) return undefined;
  return messages.find(msg => msg.id === id);
}

export function filterConversationsByDate(
  conversations: Conversation[],
  startDate: Date | null,
  endDate: Date | null
): Conversation[] {
  if (!startDate && !endDate) return conversations;
  
  return conversations.filter(conv => {
    const convDate = new Date(conv.updatedAt * 1000);
    if (startDate && convDate < startDate) return false;
    if (endDate && convDate > endDate) return false;
    return true;
  });
}

export function filterConversationsByRating(
  conversations: Conversation[],
  minRating: number,
  maxRating: number,
  includeUnrated: boolean
): Conversation[] {
  return conversations.filter(conv => {
    if (conv.averageRating === null) {
      return includeUnrated;
    }
    return conv.averageRating >= minRating && conv.averageRating <= maxRating;
  });
}

export function filterQAPairsByRating(
  qaPairs: QAPair[],
  minRating: number,
  maxRating: number,
  includeUnrated: boolean
): QAPair[] {
  return qaPairs.filter(qa => {
    if (qa.rating === null) {
      return includeUnrated;
    }
    return qa.rating >= minRating && qa.rating <= maxRating;
  });
}

export function searchInConversations(
  conversations: Conversation[],
  searchTerm: string
): Conversation[] {
  if (!searchTerm.trim()) return conversations;
  
  const term = searchTerm.toLowerCase();
  
  return conversations.filter(conv => {
    // Search in title
    if (conv.title.toLowerCase().includes(term)) return true;
    
    // Search in messages
    return conv.messages.some(msg => 
      msg.content.toLowerCase().includes(term)
    );
  });
}

export function searchInQAPairs(
  qaPairs: QAPair[],
  searchTerm: string
): QAPair[] {
  if (!searchTerm.trim()) return qaPairs;
  
  const term = searchTerm.toLowerCase();
  
  return qaPairs.filter(qa => {
    return qa.question.content.toLowerCase().includes(term) ||
           qa.answer.content.toLowerCase().includes(term) ||
           qa.comment.toLowerCase().includes(term);
  });
}

export function filterConversationsByModel(
  conversations: Conversation[],
  selectedModels: string[]
): Conversation[] {
  if (!selectedModels.length) return conversations;
  
  return conversations.filter(conv => {
    return conv.modelsUsed?.some(model => selectedModels.includes(model));
  });
}

export function getAllModelsFromConversations(
  conversations: Conversation[]
): string[] {
  const modelsSet = new Set<string>();
  
  conversations.forEach(conv => {
    conv.modelsUsed?.forEach(model => {
      modelsSet.add(model);
    });
  });
  
  return Array.from(modelsSet).sort();
}