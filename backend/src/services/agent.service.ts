import { Agent } from '../types/agent.types.js';
import { getAgentConfigurations, getAgentConfiguration, getAgentConfigService } from './config/index.js';

export class AgentService {
  public async getAgents(): Promise<Agent[]> {
    const config = await getAgentConfigurations();
    if (!config || !config.agents) {
      throw new Error('Agent configuration not available');
    }
    return config.agents as Agent[];
  }

  public async getAgentByName(name: string): Promise<Agent | undefined> {
    const config = await getAgentConfigurations();
    if (!config || !config.agents) {
      throw new Error('Agent configuration not available');
    }
    return config.agents.find(agent => agent.name === name) as Agent | undefined;
  }

  public async reloadAgents(): Promise<void> {
    console.log('🔄 Reloading agent configuration...');
    const service = getAgentConfigService();
    await service.reload();
  }
}

// Export singleton instance
export const agentService = new AgentService();