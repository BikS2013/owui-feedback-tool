import * as yaml from 'yaml';
import { ConfigService } from './config-service-template.js';
import { Agent, AgentConfig } from '../types/agent.types.js';

class AgentConfigService extends ConfigService<AgentConfig> {
  constructor() {
    super(
      process.env.AGENT_CONFIG_ASSET_KEY || 'settings/agent-config.yaml',
      'agent-config.yaml',
      (content: string) => yaml.parse(content) as AgentConfig
    );
  }

  protected processConfiguration(data: AgentConfig): void {
    // Store each agent by name for easy lookup
    if (data.agents) {
      data.agents.forEach(agent => {
        this.configs.set(agent.name, agent);
      });
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    const allConfigs = await this.getAll();
    return Array.from(allConfigs.values()) as Agent[];
  }

  async getAgentByName(name: string): Promise<Agent | undefined> {
    return await this.getConfig(name) as Agent | undefined;
  }
}

// Create singleton instance
let instance: AgentConfigService | null = null;

export function getAgentConfigService(): AgentConfigService {
  if (!instance) {
    instance = new AgentConfigService();
  }
  return instance;
}

// Helper functions for agent-specific operations
export async function getAllAgents(): Promise<Agent[]> {
  const service = getAgentConfigService();
  return await service.getAllAgents();
}

export async function getAgentByName(name: string): Promise<Agent | undefined> {
  const service = getAgentConfigService();
  return await service.getAgentByName(name);
}

export async function reloadAgentConfig(): Promise<void> {
  const service = getAgentConfigService();
  await service.reload();
}