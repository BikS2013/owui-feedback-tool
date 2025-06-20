import { Agent } from '../types/agent.types.js';
import { getAllAgents, getAgentByName, reloadAgentConfig } from './agentConfigService.js';

export class AgentService {
  public async getAgents(): Promise<Agent[]> {
    return await getAllAgents();
  }

  public async getAgentByName(name: string): Promise<Agent | undefined> {
    return await getAgentByName(name);
  }

  public async reloadAgents(): Promise<void> {
    console.log('🔄 Reloading agent configuration...');
    await reloadAgentConfig();
  }
}

// Export singleton instance
export const agentService = new AgentService();