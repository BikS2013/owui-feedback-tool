import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Agent, AgentConfig } from '../types/agent.types.js';

export class AgentService {
  private configPath: string;
  private agents: Agent[] = [];

  constructor() {
    this.configPath = path.join(process.cwd(), 'agent-config.yaml');
    this.loadAgents();
  }

  private loadAgents(): void {
    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf-8');
      const config: AgentConfig = yaml.parse(fileContent);
      this.agents = config.agents || [];
      console.log(`✅ Loaded ${this.agents.length} agents from configuration`);
    } catch (error) {
      console.error('❌ Failed to load agent configuration:', error);
      this.agents = [];
    }
  }

  public getAgents(): Agent[] {
    return this.agents;
  }

  public getAgentByName(name: string): Agent | undefined {
    return this.agents.find(agent => agent.name === name);
  }

  public reloadAgents(): void {
    console.log('🔄 Reloading agent configuration...');
    this.loadAgents();
  }
}

// Export singleton instance
export const agentService = new AgentService();