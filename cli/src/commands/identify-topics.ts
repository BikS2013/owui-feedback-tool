import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger.js';
import { LLMApiClient } from '../api/llm-client.js';
import { SystemPromptsApiClient } from '../api/system-prompts-client.js';
import { createLLMFromConfig } from '../utils/llm-factory.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ExtractedQuestion } from '../types/index.js';
import { 
  buildSystemPrompt, 
  buildHumanPrompt, 
  TOPIC_IDENTIFICATION_CONFIG,
  type TopicWithDescription 
} from '../prompts/topic-identification.js';
import { buildPromptFromTemplate } from '../utils/prompt-template.js';

interface IdentifyTopicsOptions {
  input: string;
  output: string;
  llm: string;
  first?: string;
  initialTopics?: string;
}

interface ThreadQuestions {
  conversationId: string;
  conversationTimestamp: string;
  questions: ExtractedQuestion[];
}

interface ThreadTopicClassification {
  conversationId: string;
  conversationTimestamp: string;
  threadTopic?: string; // Overall thread topic if all questions relate to same topic
  questionTopics: {
    questionOrder: number;
    questionText: string;
    topic: string;
  }[];
}

interface TopicsOutput {
  threadClassifications: ThreadTopicClassification[];
  topicSummary: {
    [topic: string]: {
      threads: string[]; // Thread IDs classified under this topic
      questions: {
        conversationId: string;
        questionOrder: number;
        questionText: string;
      }[];
    };
  };
  topicsUsed: {
    [topic: string]: {
      description: string;
      source: 'initial' | 'llm-generated';
    };
  };
  metadata: {
    totalThreads: number;
    totalQuestions: number;
    totalTopics: number;
    llmUsed: string;
    processedAt: string;
  };
}

function loadInitialTopics(filePath?: string): TopicWithDescription[] {
  if (!filePath) return [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!data.topics || !Array.isArray(data.topics)) {
      logger.error('Invalid initial topics file format: missing topics array');
      return [];
    }
    
    return data.topics.map((t: any) => ({
      topic: t.topic,
      description: t.description
    }));
  } catch (error) {
    logger.error(`Failed to load initial topics from ${filePath}`, error);
    return [];
  }
}

async function identifyTopicForThread(
  llm: any,
  thread: ThreadQuestions,
  existingTopics: TopicWithDescription[],
  topicsUsed: Map<string, { description: string; source: 'initial' | 'llm-generated' }>,
  promptTemplate?: string
): Promise<ThreadTopicClassification> {
  const classification: ThreadTopicClassification = {
    conversationId: thread.conversationId,
    conversationTimestamp: thread.conversationTimestamp,
    questionTopics: []
  };
  
  const questionTopics: string[] = [];
  
  // Process each question with context from previous questions
  for (let i = 0; i < thread.questions.length; i++) {
    const currentQuestion = thread.questions[i];
    const previousQuestions = thread.questions.slice(0, i);
    
    // Build prompts - use template if provided, otherwise use hardcoded prompts
    let messages: any[];
    
    if (promptTemplate) {
      // Use the prompt template from system prompts API
      const prompt = buildPromptFromTemplate(promptTemplate, {
        existingTopics,
        previousQuestions: previousQuestions.map((q, idx) => ({
          index: idx + 1,
          text: q.questionText
        })),
        currentQuestion: {
          index: i + 1,
          text: currentQuestion.questionText
        },
        isFirstQuestion: i === 0
      });
      
      // Debug: Log the prompt to see what's being sent (only for first question of first thread)
      if (i === 0) {
        logger.info('=== PROMPT DEBUG ===');
        logger.info('Prompt length:', prompt.length);
        logger.info('First 500 chars of prompt:');
        logger.info(prompt.substring(0, 500));
        logger.info('=== END PROMPT DEBUG ===');
      }
      
      // Split the prompt into system and human parts
      // Everything before "Context:" is the system message
      // Everything from "Context:" onwards is the human message
      const contextIndex = prompt.indexOf('Context:');
      if (contextIndex !== -1) {
        const systemPart = prompt.substring(0, contextIndex).trim();
        const humanPart = prompt.substring(contextIndex).trim();
        messages = [
          new SystemMessage(systemPart),
          new HumanMessage(humanPart)
        ];
      } else {
        // Fallback if format is different
        messages = [new SystemMessage(prompt)];
      }
    } else {
      // Use hardcoded prompts as fallback
      const systemPrompt = buildSystemPrompt(existingTopics);
      const humanPrompt = buildHumanPrompt({
        existingTopics,
        previousQuestions: previousQuestions.map((q, idx) => ({
          index: idx + 1,
          text: q.questionText
        })),
        currentQuestion: {
          index: i + 1,
          text: currentQuestion.questionText
        },
        isFirstQuestion: i === 0
      });
      messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(humanPrompt)
      ];
    }
    
    try {
      const response = await llm.invoke(messages);
      
      let topicData: { topic: string; description?: string };
      
      try {
        // Try to parse as JSON
        const responseText = response.content.trim();
        
        // Log the raw response for debugging
        if (i === 0 && thread.questions.length > 0) {
          logger.debug('Raw LLM response:', responseText.substring(0, 200) + '...');
        }
        
        topicData = JSON.parse(responseText);
        
        // Validate the response format
        if (!topicData.topic || typeof topicData.topic !== 'string') {
          throw new Error('Invalid response format: missing or invalid topic field');
        }
      } catch (error) {
        // Log parsing error
        logger.error(`Failed to parse LLM response as JSON for question ${i + 1}:`, error);
        logger.error('Response was:', response.content.substring(0, 100) + '...');
        
        // Fallback: Use a generic topic
        topicData = { 
          topic: 'Uncategorized',
          description: 'Unable to classify - LLM response was not in expected format'
        };
      }
      
      const topic = topicData.topic;
      
      // Validate topic is actually a short topic name (not an explanation)
      if (topic.length > 50) {
        logger.warn(`Topic too long (${topic.length} chars), likely an explanation instead of a topic name`);
        logger.warn(`Full topic text: ${topic.substring(0, 100)}...`);
        // Use a fallback topic
        topicData = {
          topic: 'Uncategorized',
          description: 'LLM returned explanation text instead of a topic name'
        };
      }
      
      questionTopics.push(topicData.topic);
      
      // Check if this is a new topic
      const existingTopic = existingTopics.find(t => t.topic === topic);
      if (!existingTopic) {
        // New topic created by LLM
        const newTopic: TopicWithDescription = {
          topic,
          description: topicData.description || `Questions related to ${topic.toLowerCase()}`
        };
        existingTopics.push(newTopic);
        topicsUsed.set(topic, { 
          description: newTopic.description, 
          source: 'llm-generated' 
        });
        logger.info(`New topic identified: "${topic}" - ${newTopic.description}`);
      } else if (!topicsUsed.has(topic)) {
        // Existing topic used for the first time
        topicsUsed.set(topic, { 
          description: existingTopic.description, 
          source: 'initial' 
        });
      }
      
      classification.questionTopics.push({
        questionOrder: currentQuestion.questionOrder,
        questionText: currentQuestion.questionText,
        topic: topic
      });
      
    } catch (error) {
      logger.error(`Failed to identify topic for question: ${currentQuestion.questionText}`, error);
      const fallbackTopic = TOPIC_IDENTIFICATION_CONFIG.fallbackTopic;
      questionTopics.push(fallbackTopic);
      
      if (!topicsUsed.has(fallbackTopic)) {
        topicsUsed.set(fallbackTopic, {
          description: TOPIC_IDENTIFICATION_CONFIG.fallbackDescription,
          source: 'llm-generated'
        });
      }
      
      classification.questionTopics.push({
        questionOrder: currentQuestion.questionOrder,
        questionText: currentQuestion.questionText,
        topic: fallbackTopic
      });
    }
  }
  
  // Check if all questions have the same topic
  const uniqueTopics = [...new Set(questionTopics)];
  if (uniqueTopics.length === 1) {
    classification.threadTopic = uniqueTopics[0];
    logger.info(`Thread ${thread.conversationId} has a single topic: ${classification.threadTopic}`);
  } else {
    logger.info(`Thread ${thread.conversationId} has multiple topics: ${uniqueTopics.join(', ')}`);
  }
  
  return classification;
}

function groupQuestionsByThread(questions: ExtractedQuestion[]): ThreadQuestions[] {
  const threadMap = new Map<string, ThreadQuestions>();
  
  for (const question of questions) {
    if (!threadMap.has(question.conversationId)) {
      threadMap.set(question.conversationId, {
        conversationId: question.conversationId,
        conversationTimestamp: question.conversationTimestamp,
        questions: []
      });
    }
    
    threadMap.get(question.conversationId)!.questions.push(question);
  }
  
  // Sort questions within each thread by order
  for (const thread of threadMap.values()) {
    thread.questions.sort((a, b) => a.questionOrder - b.questionOrder);
  }
  
  return Array.from(threadMap.values());
}

async function identifyTopics(
  questions: ExtractedQuestion[],
  llmConfig: any,
  llmName: string,
  initialTopics: TopicWithDescription[],
  promptTemplate?: string
): Promise<TopicsOutput> {
  // Use configuration from prompts file for consistent topic identification
  const llm = createLLMFromConfig(llmConfig, { 
    temperature: TOPIC_IDENTIFICATION_CONFIG.temperature,
    maxTokens: TOPIC_IDENTIFICATION_CONFIG.maxTokens
  });
  
  const existingTopics: TopicWithDescription[] = [...initialTopics];
  const topicsUsed = new Map<string, { description: string; source: 'initial' | 'llm-generated' }>();
  
  // Group questions by thread
  const threads = groupQuestionsByThread(questions);
  logger.info(`Processing ${threads.length} threads containing ${questions.length} questions`);
  
  const threadClassifications: ThreadTopicClassification[] = [];
  
  // Process each thread
  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    logger.info(`Processing thread ${i + 1}/${threads.length} (${thread.conversationId}) with ${thread.questions.length} questions`);
    
    const classification = await identifyTopicForThread(llm, thread, existingTopics, topicsUsed, promptTemplate);
    threadClassifications.push(classification);
    
    // Add a small delay to avoid rate limiting
    if (i < threads.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Build topic summary
  const topicSummary: TopicsOutput['topicSummary'] = {};
  
  for (const threadClass of threadClassifications) {
    // If thread has a single topic, add the thread to that topic
    if (threadClass.threadTopic) {
      if (!topicSummary[threadClass.threadTopic]) {
        topicSummary[threadClass.threadTopic] = {
          threads: [],
          questions: []
        };
      }
      
      topicSummary[threadClass.threadTopic].threads.push(threadClass.conversationId);
      
      // Add all questions from this thread to the topic
      for (const qt of threadClass.questionTopics) {
        topicSummary[threadClass.threadTopic].questions.push({
          conversationId: threadClass.conversationId,
          questionOrder: qt.questionOrder,
          questionText: qt.questionText
        });
      }
    } else {
      // Thread has multiple topics, add questions to their respective topics
      for (const qt of threadClass.questionTopics) {
        if (!topicSummary[qt.topic]) {
          topicSummary[qt.topic] = {
            threads: [],
            questions: []
          };
        }
        
        // Add thread ID if not already present
        if (!topicSummary[qt.topic].threads.includes(threadClass.conversationId)) {
          topicSummary[qt.topic].threads.push(threadClass.conversationId);
        }
        
        topicSummary[qt.topic].questions.push({
          conversationId: threadClass.conversationId,
          questionOrder: qt.questionOrder,
          questionText: qt.questionText
        });
      }
    }
  }
  
  // Sort topics alphabetically
  const sortedTopicSummary: TopicsOutput['topicSummary'] = {};
  Object.keys(topicSummary).sort().forEach(topic => {
    sortedTopicSummary[topic] = topicSummary[topic];
  });
  
  // Convert topicsUsed Map to object
  const topicsUsedObject: TopicsOutput['topicsUsed'] = {};
  for (const [topic, data] of topicsUsed.entries()) {
    topicsUsedObject[topic] = data;
  }
  
  return {
    threadClassifications,
    topicSummary: sortedTopicSummary,
    topicsUsed: topicsUsedObject,
    metadata: {
      totalThreads: threads.length,
      totalQuestions: questions.length,
      totalTopics: Object.keys(sortedTopicSummary).length,
      llmUsed: llmName,
      processedAt: new Date().toISOString()
    }
  };
}

export const identifyTopicsCommand = new Command('identify_topics')
  .description('Identify topics for questions using an LLM with thread context')
  .requiredOption('-i, --input <file>', 'Input questions JSON file')
  .requiredOption('-o, --output <file>', 'Output topics JSON file')
  .requiredOption('-l, --llm <name>', 'LLM configuration name to use')
  .option('-f, --first <number>', 'Process only the first N questions')
  .option('-t, --initial-topics <file>', 'Initial topics JSON file with predefined topics and descriptions')
  .action(async (options: IdentifyTopicsOptions) => {
    try {
      logger.info('Starting topic identification', options);
      
      // Load initial topics if provided
      const initialTopics = loadInitialTopics(options.initialTopics);
      if (initialTopics.length > 0) {
        logger.info(`Loaded ${initialTopics.length} initial topics`);
      }
      
      // Read questions from input file
      const fileContent = readFileSync(options.input, 'utf-8');
      const questionsData = JSON.parse(fileContent);
      
      let questions: ExtractedQuestion[] = questionsData.questions || questionsData;
      
      // Limit to first N questions if specified
      if (options.first) {
        const limit = parseInt(options.first, 10);
        if (!isNaN(limit) && limit > 0) {
          questions = questions.slice(0, limit);
          logger.info(`Processing first ${limit} questions`);
        }
      }
      
      if (questions.length === 0) {
        logger.error('No questions found in input file');
        process.exit(1);
      }
      
      // Fetch LLM configuration
      const llmClient = new LLMApiClient();
      const llmConfig = await llmClient.getConfigurationByName(options.llm);
      
      if (!llmConfig) {
        logger.error(`LLM configuration '${options.llm}' not found`);
        logger.info('Fetching available configurations...');
        const configs = await llmClient.getConfigurations();
        logger.info('Available LLM configurations:');
        configs.forEach(c => logger.info(`  - ${c.name}`));
        process.exit(1);
      }
      
      // Try to fetch prompt template from system prompts API
      let promptTemplate: string | undefined;
      const promptFilename = process.env.TOPIC_IDENTIFICATION_PROMPT;
      
      if (promptFilename) {
        try {
          logger.info(`Fetching topic identification prompt: ${promptFilename}`);
          const systemPromptsClient = new SystemPromptsApiClient();
          const prompt = await systemPromptsClient.getPrompt(promptFilename);
          promptTemplate = prompt.content;
          logger.info('Successfully fetched prompt template from system prompts API');
        } catch (error: any) {
          logger.warn(`Failed to fetch prompt template: ${error.message}`);
          logger.info('Falling back to hardcoded prompts');
        }
      } else {
        logger.info('TOPIC_IDENTIFICATION_PROMPT not set, using hardcoded prompts');
      }
      
      // Identify topics
      const topicsOutput = await identifyTopics(questions, llmConfig, options.llm, initialTopics, promptTemplate);
      
      // Write output
      writeFileSync(options.output, JSON.stringify(topicsOutput, null, 2), 'utf-8');
      
      logger.info(`Topic identification complete:`);
      logger.info(`  - Total threads: ${topicsOutput.metadata.totalThreads}`);
      logger.info(`  - Total questions: ${topicsOutput.metadata.totalQuestions}`);
      logger.info(`  - Topics identified: ${topicsOutput.metadata.totalTopics}`);
      logger.info(`  - Output saved to: ${options.output}`);
      
      // Log topic summary
      logger.info('\nTopic Summary:');
      Object.entries(topicsOutput.topicSummary).forEach(([topic, data]) => {
        logger.info(`  - ${topic}: ${data.threads.length} threads, ${data.questions.length} questions`);
      });
      
      // Log topics used
      logger.info('\nTopics Used:');
      Object.entries(topicsOutput.topicsUsed).forEach(([topic, data]) => {
        logger.info(`  - ${topic} (${data.source}): ${data.description}`);
      });
      
      // Log thread classification summary
      const singleTopicThreads = topicsOutput.threadClassifications.filter(t => t.threadTopic).length;
      const multiTopicThreads = topicsOutput.threadClassifications.filter(t => !t.threadTopic).length;
      logger.info(`\nThread Classification:`);
      logger.info(`  - Single-topic threads: ${singleTopicThreads}`);
      logger.info(`  - Multi-topic threads: ${multiTopicThreads}`);
      
    } catch (error) {
      logger.error('Failed to identify topics', error);
      process.exit(1);
    }
  });