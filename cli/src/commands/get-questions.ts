import { Command } from 'commander';
import { ThreadsApiClient } from '../api/threads-client.js';
import { OutputFormatter } from '../utils/output-formatter.js';
import { logger } from '../utils/logger.js';
import { extractQuestionsFromThread } from '../utils/question-extraction.js';
import type { ExtractedQuestion } from '../types/index.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';

interface GetQuestionsOptions {
  fromDate: string;
  toDate: string;
  agentName: string;
  output?: string;
}

interface QuestionsData {
  questions: ExtractedQuestion[];
  metadata: {
    lastUpdated: string;
    totalQuestions: number;
    fromDate: string;
    toDate: string;
    agentName: string;
  };
}

async function saveQuestionsIncrementally(
  questions: ExtractedQuestion[],
  outputPath: string,
  isFirstPage: boolean,
  options: GetQuestionsOptions
) {
  let existingData: QuestionsData = { 
    questions: [], 
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalQuestions: 0,
      fromDate: options.fromDate,
      toDate: options.toDate,
      agentName: options.agentName
    }
  };
  
  // If not the first page, read existing data
  if (!isFirstPage && existsSync(outputPath)) {
    try {
      const fileContent = readFileSync(outputPath, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      logger.error('Failed to read existing file', error);
    }
  }
  
  // Merge new questions with existing ones
  existingData.questions.push(...questions);
  existingData.metadata.lastUpdated = new Date().toISOString();
  existingData.metadata.totalQuestions = existingData.questions.length;
  
  // Write back to file
  writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
  logger.info(`Saved ${questions.length} questions to ${outputPath} (total: ${existingData.questions.length})`);
}

async function extractAllQuestions(
  apiClient: ThreadsApiClient,
  fromDate: string,
  toDate: string,
  agentName: string,
  outputPath?: string
): Promise<ExtractedQuestion[]> {
  const allQuestions: ExtractedQuestion[] = [];
  let page = 1;
  let hasMore = true;
  let isFirstPage = true;
  let totalThreadsProcessed = 0;
  let totalQuestionsFound = 0;
  
  while (hasMore) {
    logger.info(`Fetching page ${page}...`);
    
    const response = await apiClient.getThreads({
      fromDate,
      toDate,
      agentName,
      page,
      pageSize: 50
    });
    
    logger.info(`Found ${response.threads.length} threads on page ${page}`);
    const questionsForPage: ExtractedQuestion[] = [];
    
    for (const thread of response.threads) {
      totalThreadsProcessed++;
      logger.debug(`Processing thread ${thread.thread_id} (${totalThreadsProcessed}/${response.pagination.total})`);
      
      try {
        // Use common extraction function
        const questions = extractQuestionsFromThread(thread);
        if (questions.length > 0) {
          totalQuestionsFound += questions.length;
        }
        questionsForPage.push(...questions);
      } catch (error) {
        logger.error(`Failed to process thread ${thread.thread_id}`, error);
      }
    }
    
    // Save incrementally if output file is specified
    if (outputPath && questionsForPage.length > 0) {
      await saveQuestionsIncrementally(questionsForPage, outputPath, isFirstPage, {
        fromDate,
        toDate,
        agentName
      });
      isFirstPage = false;
    } else {
      allQuestions.push(...questionsForPage);
    }
    
    hasMore = page < response.pagination.totalPages;
    page++;
  }
  
  logger.info(`Processed ${totalThreadsProcessed} threads, found ${totalQuestionsFound} questions`);
  return allQuestions;
}

export const getQuestionsCommand = new Command('get_questions')
  .description('Extract questions from conversations within a date range')
  .requiredOption('-f, --from-date <date>', 'Start date (formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, or any ISO 8601 format)')
  .requiredOption('-t, --to-date <date>', 'End date (formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, or any ISO 8601 format)')
  .requiredOption('-a, --agent-name <name>', 'Agent name (e.g., "Customer Facing")')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .addHelpText('after', `
Date Format Examples:
  - Basic date: 2024-01-15
  - Date with time: 2024-01-15T14:30:00
  - With timezone: 2024-01-15T14:30:00Z or 2024-01-15T14:30:00+02:00
  - Full ISO 8601: 2024-01-15T14:30:00.000Z

Example Usage:
  $ owui-cli get_questions -f 2024-01-01 -t 2024-01-31
  $ owui-cli get_questions -f 2024-01-01T00:00:00Z -t 2024-01-31T23:59:59Z -a "my-agent"
  $ owui-cli get_questions -f 2024-01-01 -t 2024-01-31 -o questions.json
`)
  .action(async (options: GetQuestionsOptions) => {
    try {
      logger.info('Starting question extraction', options);
      
      const apiClient = new ThreadsApiClient();
      const formatter = new OutputFormatter();
      
      const questions = await extractAllQuestions(
        apiClient,
        options.fromDate,
        options.toDate,
        options.agentName,
        options.output
      );
      
      // If no output file specified, print to stdout
      if (!options.output) {
        await formatter.outputJson(questions);
      }
      
      logger.info(`Extraction complete.`);
    } catch (error) {
      logger.error('Failed to extract questions', error);
      process.exit(1);
    }
  });