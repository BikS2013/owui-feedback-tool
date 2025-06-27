import yaml from 'js-yaml';
import { createLazyConfigService, createGitHubSource, createDatabaseSource } from './config-factory.js';

interface AgentConfig {
  agents: Array<{
    id: string;
    name: string;
    description?: string;
    endpoint: string;
    enabled: boolean;
    configuration?: any;
  }>;
}

export const getAgentConfigService = createLazyConfigService<AgentConfig>(
  () => ({
    sources: [
      createGitHubSource(process.env.AGENT_CONFIG_ASSET_KEY || 'config/agents.yaml'),
      createDatabaseSource('agent-config', 'configuration')
    ],
    parser: async (content: string) => yaml.load(content) as AgentConfig,
    verbose: process.env.CONFIG_VERBOSE === 'true'
  }),
  (service, data) => {
  service.configs.set('content', data);
  
  // Store individual agents by ID for quick access
  if (data.agents) {
    for (const agent of data.agents) {
      service.configs.set(`agent:${agent.id}`, agent);
    }
  }
  }
);

// Get all agent configurations
export async function getAgentConfigurations(): Promise<AgentConfig | null> {
  try {
    const service = getAgentConfigService();
    return await service.getConfig('content');
  } catch (error) {
    console.error('❌ Failed to get agent configurations:', error);
    throw error;
  }
}

// Get specific agent configuration
export async function getAgentConfiguration(agentId: string): Promise<any> {
  try {
    const service = getAgentConfigService();
    return await service.getConfig(`agent:${agentId}`);
  } catch (error) {
    console.error(`❌ Failed to get agent configuration for ${agentId}:`, error);
    throw error;
  }
}

// Check if agent is enabled
export async function isAgentEnabled(agentId: string): Promise<boolean> {
  try {
    const agent = await getAgentConfiguration(agentId);
    return agent?.enabled || false;
  } catch (error) {
    return false;
  }
}