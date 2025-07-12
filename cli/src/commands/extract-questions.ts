import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger.js';
import { extractQuestionsFromThreads, type ThreadData } from '../utils/question-extraction.js';
import type { ExtractedQuestion } from '../types/index.js';

interface ExtractQuestionsOptions {
  input: string;
  output: string;
}

interface ThreadsFileData {
  threads: ThreadData[];
  metadata?: any;
}

function extractQuestionsFromThreadsFile(inputPath: string): ExtractedQuestion[] {
  logger.info(`Reading threads from ${inputPath}`);
  
  try {
    const fileContent = readFileSync(inputPath, 'utf-8');
    const data: ThreadsFileData = JSON.parse(fileContent);
    
    if (!data.threads || !Array.isArray(data.threads)) {
      throw new Error('Invalid file format: missing threads array');
    }
    
    logger.info(`Found ${data.threads.length} threads to process`);
    
    // Use common extraction function
    return extractQuestionsFromThreads(data.threads);
    
  } catch (error) {
    logger.error('Failed to read or parse threads file', error);
    throw error;
  }
}

export const extractQuestionsCommand = new Command('extract_questions')
  .description('Extract questions from a threads JSON file')
  .requiredOption('-i, --input <file>', 'Input threads JSON file path')
  .requiredOption('-o, --output <file>', 'Output questions JSON file path')
  .action(async (options: ExtractQuestionsOptions) => {
    try {
      logger.info('Starting question extraction from file', options);
      
      // Extract questions
      const questions = extractQuestionsFromThreadsFile(options.input);
      
      // Prepare output data
      const outputData = {
        questions: questions,
        metadata: {
          extractedAt: new Date().toISOString(),
          totalQuestions: questions.length,
          sourceFile: options.input
        }
      };
      
      // Write to output file
      writeFileSync(options.output, JSON.stringify(outputData, null, 2), 'utf-8');
      logger.info(`Successfully wrote ${questions.length} questions to ${options.output}`);
      
    } catch (error) {
      logger.error('Failed to extract questions', error);
      process.exit(1);
    }
  });