import { Agent } from '../types/agent.types.js';
import { getAgentConfigurations, getAgentConfiguration, getAgentConfigService } from './config/index.js';

export class AgentService {
  public async getAgents(): Promise<Agent[]> {
    const config = await getAgentConfigurations();
    if (!config || !config.agents) {
      throw new Error('Agent configuration not available');
    }
    // Map configuration agents to Agent type
    return config.agents.map(agent => ({
      name: agent.name,
      url: agent.url || agent.endpoint || '',
      database_connection_string: agent.database_connection_string || ''
    }));
  }

  public async getAgentByName(name: string): Promise<Agent | undefined> {
    const config = await getAgentConfigurations();
    if (!config || !config.agents) {
      throw new Error('Agent configuration not available');
    }
    const agent = config.agents.find(agent => agent.name === name);
    if (!agent) return undefined;
    
    return {
      name: agent.name,
      url: agent.url || agent.endpoint || '',
      database_connection_string: agent.database_connection_string || ''
    };
  }

  public async reloadAgents(): Promise<void> {
    console.log('🔄 Reloading agent configuration...');
    const service = getAgentConfigService();
    await service.reload();
  }
}

// Export singleton instance
export const agentService = new AgentService();