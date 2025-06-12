export interface Agent {
  name: string;
  url: string;
  database_connection_string: string;
}

export interface AgentConfig {
  agents: Agent[];
}