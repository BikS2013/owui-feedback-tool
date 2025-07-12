import { logger } from './logger.js';
import type { ExtractedQuestion } from '../types/index.js';

export interface ThreadData {
  thread_id: string;
  created_at?: string;
  updated_at?: string;
  values?: {
    messages?: Array<{
      id?: string;
      type: string;
      content: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Extracts questions from a single thread by looking for human messages
 * @param thread The thread data containing messages
 * @returns Array of extracted questions with order and metadata
 */
export function extractQuestionsFromThread(thread: ThreadData): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  const threadId = thread.thread_id;
  const threadTimestamp = thread.created_at || thread.updated_at || new Date().toISOString();
  
  // Check if thread has values.messages
  if (!thread.values || !thread.values.messages) {
    logger.debug(`Thread ${threadId} has no values.messages`);
    return questions;
  }
  
  const messages = thread.values.messages;
  logger.debug(`Thread ${threadId} has ${messages.length} messages`);
  
  // First pass: count total questions in thread
  const totalQuestionsInThread = messages.filter(
    message => message.type === 'human' && message.content
  ).length;
  
  // Second pass: extract questions with order and total count
  let questionOrder = 0;
  
  for (const message of messages) {
    logger.debug(`Message type: ${message.type}, content length: ${message.content?.length || 0}`);
    
    // Extract human messages as questions
    if (message.type === 'human' && message.content) {
      questionOrder++;
      
      const question: ExtractedQuestion = {
        conversationId: threadId,
        conversationTimestamp: threadTimestamp,
        questionOrder: questionOrder,
        totalQuestionsInThread: totalQuestionsInThread,
        questionText: message.content.trim()
      };
      
      questions.push(question);
      logger.debug(`Extracted question ${questionOrder}/${totalQuestionsInThread}: "${question.questionText.substring(0, 50)}..."`);
    }
  }
  
  if (questionOrder > 0) {
    logger.info(`Extracted ${questionOrder} questions from thread ${threadId}`);
  }
  
  return questions;
}

/**
 * Extracts questions from multiple threads
 * @param threads Array of thread data
 * @returns Array of all extracted questions
 */
export function extractQuestionsFromThreads(threads: ThreadData[]): ExtractedQuestion[] {
  const allQuestions: ExtractedQuestion[] = [];
  let totalQuestionsFound = 0;
  
  for (const thread of threads) {
    try {
      const questions = extractQuestionsFromThread(thread);
      if (questions.length > 0) {
        totalQuestionsFound += questions.length;
      }
      allQuestions.push(...questions);
    } catch (error) {
      logger.error(`Failed to process thread ${thread.thread_id}`, error);
    }
  }
  
  logger.info(`Total questions extracted: ${totalQuestionsFound} from ${threads.length} threads`);
  return allQuestions;
}