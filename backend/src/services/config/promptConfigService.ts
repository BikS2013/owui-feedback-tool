import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables?: string[];
  category?: string;
  version?: string;
}

interface PromptConfig {
  templates: PromptTemplate[];
}

export const getPromptConfigService = createLazyConfigService<PromptConfig>(
  () => ({
    sources: [
      createGitHubSource(process.env.PROMPT_CONFIG_ASSET_KEY || 'prompts/templates.json'),
      createDatabaseSource('prompt-templates', 'configuration')
    ],
    parser: async (content: string) => JSON.parse(content) as PromptConfig,
    verbose: process.env.CONFIG_VERBOSE === 'true'
  }),
  (service, data) => {
  service.configs.set('content', data);
  
  // Store individual templates by ID
  if (data.templates) {
    for (const template of data.templates) {
      service.configs.set(`template:${template.id}`, template);
    }
  }
  
  // Store templates by category
  const byCategory = new Map<string, PromptTemplate[]>();
  for (const template of data.templates || []) {
    const category = template.category || 'uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(template);
  }
  
  for (const [category, templates] of byCategory) {
    service.configs.set(`category:${category}`, templates);
  }
  }
);

// Get all prompt templates
export async function getPromptTemplates(): Promise<PromptConfig | null> {
  try {
    const service = getPromptConfigService();
    return await service.getConfig('content');
  } catch (error) {
    console.error('❌ Failed to get prompt templates:', error);
    throw error;
  }
}

// Get specific prompt template
export async function getPromptTemplate(templateId: string): Promise<PromptTemplate | null> {
  try {
    const service = getPromptConfigService();
    return await service.getConfig(`template:${templateId}`);
  } catch (error) {
    console.error(`❌ Failed to get prompt template ${templateId}:`, error);
    throw error;
  }
}

// Get templates by category
export async function getPromptTemplatesByCategory(category: string): Promise<PromptTemplate[]> {
  try {
    const service = getPromptConfigService();
    return (await service.getConfig(`category:${category}`)) || [];
  } catch (error) {
    console.error(`❌ Failed to get prompt templates for category ${category}:`, error);
    throw error;
  }
}