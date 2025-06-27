import { createPromptHelpers, PromptServiceConfig } from './config/promptFileService.js';

// Configuration for the filter-without-sample prompt
// This will ONLY load from the configuration repository - no local fallback
const filterWithoutSampleConfig: PromptServiceConfig = {
  envVarName: 'FILTER_WITHOUT_SAMPLE',
  defaultAssetPath: 'prompts/filter-without-sample.prompt.txt',
  promptKey: 'filter-without-sample'
};

// Create and export the helper functions
const helpers = createPromptHelpers(filterWithoutSampleConfig);

export const getFilterWithoutSamplePromptContent = helpers.getPromptContent;
export const prepareFilterWithoutSamplePrompt = helpers.preparePrompt;
export const reloadFilterWithoutSamplePrompt = helpers.reloadPrompt;