import { LangGraphThread } from '../types/langgraph';
import { Conversation } from '../types/conversation';

/**
 * Converts LangGraph threads to conversations for display
 * @param threads - Array of LangGraph threads
 * @returns Object containing converted conversations
 */
export function convertLangGraphThreadsToConversations(threads: LangGraphThread[]): {
  conversations: Conversation[];
} {
  const conversations: Conversation[] = threads.map(thread => {
    // Extract a sensible title from the thread
    let title = 'Agent Conversation';
    const messages = thread.values?.messages || [];
    
    if (messages.length > 0) {
      // Try to use the first user message as title
      const firstUserMessage = messages.find(msg => msg.type === 'human');
      if (firstUserMessage && firstUserMessage.content) {
        const content = typeof firstUserMessage.content === 'string' 
          ? firstUserMessage.content 
          : (firstUserMessage.content[0]?.text || 'Agent Conversation');
        title = content.substring(0, 100) + (content.length > 100 ? '...' : '');
      }
    }
    
    // Count messages to estimate Q&A pairs
    const messageCount = messages.length;
    
    return {
      id: thread.thread_id,
      title,
      userId: thread.metadata?.user_id || 'agent-user',
      createdAt: new Date(thread.created_at).getTime(),
      updatedAt: new Date(thread.updated_at || thread.created_at).getTime(),
      messages: [], // Empty for list display
      averageRating: null,
      totalRatings: 0,
      feedbackEntries: [],
      modelsUsed: [], // Could extract from messages if needed
      qaPairCount: Math.floor(messageCount / 2)
    };
  });
  
  return { conversations };
}