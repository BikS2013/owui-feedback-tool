#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { getQuestionsCommand } from './commands/get-questions.js';
import { getThreadsCommand } from './commands/get-threads.js';
import { extractQuestionsCommand } from './commands/extract-questions.js';
import { identifyTopicsCommand } from './commands/identify-topics.js';

dotenv.config();

const program = new Command();

program
  .name('owui-cli')
  .description('CLI tool for OWUI feedback data processing')
  .version('1.0.0');

program.addCommand(getQuestionsCommand);
program.addCommand(getThreadsCommand);
program.addCommand(extractQuestionsCommand);
program.addCommand(identifyTopicsCommand);

program.parse(process.argv);