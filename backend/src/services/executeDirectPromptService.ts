import { createPromptHelpers, PromptServiceConfig } from './config/promptFileService.js';

// Configuration for the execute-direct prompt
// This will ONLY load from the configuration repository - no local fallback
const executeDirectConfig: PromptServiceConfig = {
  envVarName: 'EXECUTE_DIRECT',
  promptKey: 'execute-direct'
};

// Create and export the helper functions
const helpers = createPromptHelpers(executeDirectConfig);

export const getExecuteDirectPromptContent = helpers.getPromptContent;
export const prepareExecuteDirectPrompt = helpers.preparePrompt;
export const reloadExecuteDirectPrompt = helpers.reloadPrompt;