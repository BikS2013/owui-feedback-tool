import { Command } from 'commander';
import { ThreadsApiClient } from '../api/threads-client.js';
import { OutputFormatter } from '../utils/output-formatter.js';
import { logger } from '../utils/logger.js';
import type { Thread, Checkpoint } from '../types/index.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';

interface GetThreadsOptions {
  fromDate: string;
  toDate: string;
  agentName: string;
  output?: string;
  includeCheckpoints?: boolean;
}

interface ThreadWithCheckpoints extends Thread {
  checkpoints?: Checkpoint[];
}

async function saveThreadsIncrementally(
  threads: ThreadWithCheckpoints[],
  outputPath: string,
  isFirstPage: boolean
) {
  let existingData: { threads: ThreadWithCheckpoints[]; metadata: any } = { threads: [], metadata: {} };
  
  // If not the first page, read existing data
  if (!isFirstPage && existsSync(outputPath)) {
    try {
      const fileContent = readFileSync(outputPath, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      logger.error('Failed to read existing file', error);
    }
  }
  
  // Merge new threads with existing ones
  existingData.threads.push(...threads);
  existingData.metadata.lastUpdated = new Date().toISOString();
  existingData.metadata.totalThreads = existingData.threads.length;
  
  // Write back to file
  writeFileSync(outputPath, JSON.stringify(existingData, null, 2), 'utf-8');
  logger.info(`Saved ${threads.length} threads to ${outputPath} (total: ${existingData.threads.length})`);
}

export const getThreadsCommand = new Command('get_threads')
  .description('Retrieve complete thread data within a date range')
  .requiredOption('-f, --from-date <date>', 'Start date (formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, or any ISO 8601 format)')
  .requiredOption('-t, --to-date <date>', 'End date (formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ssZ, or any ISO 8601 format)')
  .requiredOption('-a, --agent-name <name>', 'Agent name (e.g., "Customer Facing")')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('-c, --include-checkpoints', 'Include checkpoint data for each thread')
  .action(async (options: GetThreadsOptions) => {
    try {
      logger.info('Starting thread retrieval', options);
      
      const apiClient = new ThreadsApiClient();
      const formatter = new OutputFormatter();
      
      let page = 1;
      let hasMore = true;
      let isFirstPage = true;
      const allThreads: ThreadWithCheckpoints[] = [];
      
      while (hasMore) {
        logger.info(`Fetching page ${page}...`);
        
        const response = await apiClient.getThreads({
          fromDate: options.fromDate,
          toDate: options.toDate,
          agentName: options.agentName,
          page,
          pageSize: 50
        });
        
        const threadsForPage: ThreadWithCheckpoints[] = [];
        
        for (const thread of response.threads) {
          const threadWithCheckpoints: ThreadWithCheckpoints = { ...thread };
          
          if (options.includeCheckpoints) {
            logger.info(`Fetching checkpoints for thread ${thread.thread_id}...`);
            try {
              const checkpoints: Checkpoint[] = [];
              let checkpointPage = 1;
              let hasMoreCheckpoints = true;
              
              while (hasMoreCheckpoints) {
                const checkpointResponse = await apiClient.getThreadCheckpoints(
                  thread.thread_id,
                  options.agentName,
                  checkpointPage,
                  50
                );
                
                checkpoints.push(...checkpointResponse.checkpoints);
                hasMoreCheckpoints = checkpointPage < checkpointResponse.pagination.totalPages;
                checkpointPage++;
              }
              
              threadWithCheckpoints.checkpoints = checkpoints;
            } catch (error) {
              logger.error(`Failed to fetch checkpoints for thread ${thread.thread_id}`, error);
            }
          }
          
          threadsForPage.push(threadWithCheckpoints);
        }
        
        // Save incrementally if output file is specified
        if (options.output) {
          await saveThreadsIncrementally(threadsForPage, options.output, isFirstPage);
          isFirstPage = false;
        } else {
          allThreads.push(...threadsForPage);
        }
        
        hasMore = page < response.pagination.totalPages;
        page++;
      }
      
      // If no output file, print to stdout
      if (!options.output) {
        console.log(JSON.stringify(allThreads, null, 2));
      }
      
      logger.info(`Thread retrieval complete. Total pages processed: ${page - 1}`);
    } catch (error) {
      logger.error('Failed to retrieve threads', error);
      process.exit(1);
    }
  });