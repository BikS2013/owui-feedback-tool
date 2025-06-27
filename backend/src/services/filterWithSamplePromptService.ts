import { createPromptHelpers, PromptServiceConfig } from './config/promptFileService.js';

// Configuration for the filter-with-sample prompt
// This will ONLY load from the configuration repository - no local fallback
const filterWithSampleConfig: PromptServiceConfig = {
  envVarName: 'FILTER_WITH_SAMPLE',
  defaultAssetPath: 'prompts/filter-with-sample.prompt.txt',
  promptKey: 'filter-with-sample'
};

// Create and export the helper functions
const helpers = createPromptHelpers(filterWithSampleConfig);

export const getFilterWithSamplePromptContent = helpers.getPromptContent;
export const prepareFilterWithSamplePrompt = helpers.preparePrompt;
export const reloadFilterWithSamplePrompt = helpers.reloadPrompt;