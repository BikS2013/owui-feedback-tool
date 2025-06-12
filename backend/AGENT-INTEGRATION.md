# AGENT-INTEGRATION.md

This document serves as the central source of truth for all information regarding integrating agent data into the application. All design decisions, configurations, and technical specifications related to agent integration must be documented here.

## Overview

The agent integration system allows the application to connect to multiple AI agents, retrieve their data, and aggregate it for analysis and monitoring purposes.

## Configuration

### Agent Configuration File (agent-config.yaml)

All agent configurations are stored in `backend/agent-config.yaml`. This file contains the essential connection information for each integrated agent.

#### File Structure

```yaml
agents:
  - name: string          # Unique identifier for the agent
    url: string           # API endpoint URL for the agent
    database_connection_string: string  # PostgreSQL connection string
```

#### Example Configuration

```yaml
agents:
  - name: "Agent-1"
    url: "http://localhost:3001/api/agent1"
    database_connection_string: "postgresql://user:password@localhost:5432/agent1_db"
```

#### Field Descriptions

- **name**: A unique identifier for the agent. Used throughout the application to reference specific agents.
- **url**: The complete API endpoint URL where the agent's REST API is accessible.
- **database_connection_string**: PostgreSQL connection string for direct database access to the agent's data store. Format: `postgresql://[user]:[password]@[host]:[port]/[database]`

## Data Integration Methods

### 1. API-Based Integration
Agents expose REST APIs that the application can query to retrieve conversation data and metrics.

### 2. Direct Database Access
For performance-critical operations, the application can connect directly to agent databases using the provided connection strings.

## Security Considerations

- Database credentials should be stored securely and never committed to version control
- Use environment variables for sensitive configuration in production
- Implement proper authentication for API endpoints
- Use SSL/TLS for all database connections in production

## Agent Data Schema

### Thread Table Schema

The `thread` table in each agent's database is expected to have the following structure:

```sql
CREATE TABLE thread (
    thread_id VARCHAR PRIMARY KEY,
    thread_ts VARCHAR,
    channel_id VARCHAR,
    configurable JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSONB,
    checkpoint JSONB,
    parent_checkpoint JSONB
);
```

#### Field Descriptions:
- **thread_id**: Unique identifier for each thread/conversation
- **thread_ts**: Thread timestamp (typically in ISO format)
- **channel_id**: Optional channel identifier for multi-channel support
- **configurable**: JSON object containing configuration settings
- **created_at**: Timestamp when the thread was created
- **updated_at**: Timestamp of the last update to the thread
- **metadata**: Additional metadata as JSON
- **checkpoint**: Current state checkpoint data
- **parent_checkpoint**: Reference to parent checkpoint for thread history

## Integration Endpoints

### Agent Management API

The backend provides the following endpoints for agent management:

#### GET /api/agent
Returns a list of all configured agents with their connection details.

#### GET /api/agent/:name
Returns details for a specific agent by name.

#### POST /api/agent/reload
Reloads the agent configuration from the `agent-config.yaml` file without restarting the server.

#### GET /api/agent/threads
Fetches paginated thread data from a specific agent's database. Requires `agentName` as a query parameter and supports pagination through `page` and `limit` parameters.

These endpoints enable the frontend to:
- Discover available agents dynamically
- Display agent information in the UI
- Allow users to select which agent's data to analyze
- Fetch and display thread/conversation data from agent databases
- Implement pagination for large datasets
- Refresh agent configurations on demand

## Error Handling

[To be documented: How to handle agent connection failures and data inconsistencies]

## Performance Optimization

[To be documented: Caching strategies, connection pooling, etc.]

## Monitoring and Logging

[To be documented: How agent integrations are monitored and logged]