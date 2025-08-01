# LangGraph Agent API Documentation

This document provides comprehensive documentation for all agent-related API endpoints in the backend service. These endpoints facilitate interaction with LangGraph agents, including configuration management, database connectivity, and data retrieval.

## Table of Contents
- [Overview](#overview)
- [Agent Management Endpoints](#agent-management-endpoints)
- [Agent Connection Testing](#agent-connection-testing)
- [Thread Data Endpoints](#thread-data-endpoints)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

## Overview

The Agent API provides a comprehensive interface for managing and interacting with LangGraph agents. It supports:
- Agent configuration management
- Database connection testing
- Thread data retrieval with pagination
- Document and checkpoint access
- Run history tracking

All endpoints follow RESTful conventions and return JSON responses.

## Agent Management Endpoints

### Agent Configuration Retrieval Process

The agent configuration is stored as a YAML file in the GitHub registry. When API endpoints need to return agent information, they follow this process:

1. **Asset Retrieval**: The API retrieves the YAML configuration file from the GitHub registry using the asset key specified in the `AGENT_CONFIG_ASSET_KEY` environment variable.

2. **YAML Parsing**: The retrieved YAML content is parsed to extract the agent configurations.

3. **Data Transformation**: The parsed YAML data is converted to the API response format, which includes:
   - Extracting agent names, URLs, and database connection strings
   - Masking sensitive information (database credentials)
   - Formatting the data according to the API's JSON response structure

4. **Caching**: The configuration is cached in memory to avoid repeated GitHub API calls for subsequent requests.

### 1. Get All Agents

Retrieves a list of all configured agents with masked database connection strings for security. This endpoint internally fetches the agent configuration from GitHub registry and transforms it to the expected response format.

**Endpoint:** `GET /api/agent`

**Internal Process:**
1. Fetches the YAML configuration from GitHub using `AGENT_CONFIG_ASSET_KEY`
2. Parses the YAML to extract agent definitions
3. Transforms each agent entry to include masked connection strings
4. Returns the formatted JSON response

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "name": "Customer Facing",
      "url": "http://localhost:3001/api/agent1",
      "database_connection_string": "postgresql://u**r:********@localhost:5432/agent1_db"
    },
    {
      "name": "Internal Support",
      "url": "http://localhost:3001/api/agent2",
      "database_connection_string": "postgresql://u**r:********@localhost:5432/agent2_db"
    }
  ],
  "count": 2
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Server error

### 2. Get Agent by Name

Retrieves details for a specific agent by name. Like the list endpoint, this internally fetches the configuration from GitHub and filters for the requested agent.

**Endpoint:** `GET /api/agent/:name`

**Internal Process:**
1. Fetches the YAML configuration from GitHub using `AGENT_CONFIG_ASSET_KEY`
2. Parses the YAML and searches for the agent with matching name
3. Transforms the single agent entry with masked connection string
4. Returns the formatted JSON response or 404 if not found

**Parameters:**
- `name` (path parameter): The name of the agent

**Example:** `GET /api/agent/Customer%20Facing`

**Response:**
```json
{
  "success": true,
  "agent": {
    "name": "Customer Facing",
    "url": "http://localhost:3001/api/agent1",
    "database_connection_string": "postgresql://u**r:********@localhost:5432/agent1_db"
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Server error

### 3. Reload Agent Configuration

Forces a fresh retrieval of the agent configuration from the GitHub registry, clearing any cached data.

**Endpoint:** `POST /api/agent/reload`

**Internal Process:**
1. Clears the in-memory cache of agent configurations
2. Fetches the latest YAML configuration from GitHub using `AGENT_CONFIG_ASSET_KEY`
3. Parses and validates the new configuration
4. Updates the cache with the fresh data

**Response:**
```json
{
  "success": true,
  "message": "Agent configuration reloaded successfully",
  "agentCount": 2
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Configuration reload failed

## Agent Connection Testing

### 4. Test Agent Database Connection (Query Parameter)

Tests the database connection for a specific agent.

**Endpoint:** `GET /api/agent/test-connection`

**Query Parameters:**
- `agentName` (required): Name of the agent to test

**Example:** `GET /api/agent/test-connection?agentName=Customer%20Facing`

**Response (Success):**
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "agent": "Customer Facing",
    "database": "PostgreSQL",
    "timestamp": "2025-01-22T10:30:00Z"
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Connection failed",
  "error": "ECONNREFUSED: Connection refused",
  "details": {
    "agent": "Customer Facing",
    "timestamp": "2025-01-22T10:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK`: Connection test completed (check `success` field)
- `400 Bad Request`: Missing agentName parameter
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Server error

### 5. Test Agent Database Connection (Path Parameter)

Alternative endpoint for testing database connection using path parameter.

**Endpoint:** `GET /api/agent/test-connection/:name`

**Parameters:**
- `name` (path parameter): Name of the agent

**Example:** `GET /api/agent/test-connection/Customer%20Facing`

**Response:** Same as endpoint #4

## Thread Data Endpoints

### 6. Get Agent Threads

Retrieves paginated thread data from an agent's database with optional filtering.

**Endpoint:** `GET /api/agent/threads`

**Query Parameters:**
- `agentName` (required): Name of the agent
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 50, max: 500): Number of items per page
- `include_retrieved_docs` (optional, default: false): Include retrieved documents in response
- `fromDate` (optional): Filter threads created from this date (ISO 8601 format)
- `toDate` (optional): Filter threads created until this date (ISO 8601 format)

**Example:** `GET /api/agent/threads?agentName=Customer%20Facing&page=1&limit=20&fromDate=2025-01-01T00:00:00Z`

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "thread_id": "123e4567-e89b-12d3-a456-426614174000",
        "created_at": "2025-01-22T09:00:00Z",
        "updated_at": "2025-01-22T09:30:00Z",
        "metadata": {
          "user_id": "user123",
          "session_type": "chat"
        },
        "messages": [
          {
            "id": "msg1",
            "role": "user",
            "content": "Hello, I need help",
            "timestamp": "2025-01-22T09:00:00Z"
          },
          {
            "id": "msg2",
            "role": "assistant",
            "content": "Hello! How can I assist you today?",
            "timestamp": "2025-01-22T09:00:10Z"
          }
        ],
        "retrieved_docs": [] // Only included if include_retrieved_docs=true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing agentName or invalid parameters
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Database query error

### 7. Get Thread Documents

Retrieves documents associated with a specific thread.

**Endpoint:** `GET /api/agent/thread/:threadId/documents`

**Parameters:**
- `threadId` (path parameter): The thread ID

**Query Parameters:**
- `agentName` (required): Name of the agent

**Example:** `GET /api/agent/thread/123e4567-e89b-12d3-a456-426614174000/documents?agentName=Customer%20Facing`

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "123e4567-e89b-12d3-a456-426614174000",
    "documents": [
      {
        "id": "doc1",
        "title": "Product Manual",
        "content": "...",
        "source": "knowledge_base",
        "relevance_score": 0.95,
        "metadata": {
          "category": "product",
          "last_updated": "2025-01-20T00:00:00Z"
        }
      }
    ],
    "count": 1
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing agentName
- `404 Not Found`: Thread or agent not found
- `500 Internal Server Error`: Database query error

### 8. Get Thread Runs

Retrieves run history for a specific thread with pagination.

**Endpoint:** `GET /api/agent/thread/:threadId/runs`

**Parameters:**
- `threadId` (path parameter): The thread ID

**Query Parameters:**
- `agentName` (required): Name of the agent
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 100): Items per page

**Example:** `GET /api/agent/thread/123e4567-e89b-12d3-a456-426614174000/runs?agentName=Customer%20Facing&page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "123e4567-e89b-12d3-a456-426614174000",
    "runs": [
      {
        "run_id": "run1",
        "status": "completed",
        "started_at": "2025-01-22T09:00:00Z",
        "completed_at": "2025-01-22T09:00:15Z",
        "model": "gpt-4",
        "total_tokens": 250,
        "metadata": {
          "workflow": "customer_support",
          "version": "1.2.0"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing agentName or invalid parameters
- `404 Not Found`: Thread or agent not found
- `500 Internal Server Error`: Database query error

### 9. Get Thread Checkpoints

Retrieves checkpoint data for a specific thread with pagination.

**Endpoint:** `GET /api/agent/thread/:threadId/checkpoints`

**Parameters:**
- `threadId` (path parameter): The thread ID

**Query Parameters:**
- `agentName` (required): Name of the agent
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 100): Items per page

**Example:** `GET /api/agent/thread/123e4567-e89b-12d3-a456-426614174000/checkpoints?agentName=Customer%20Facing`

**Response:**
```json
{
  "success": true,
  "data": {
    "threadId": "123e4567-e89b-12d3-a456-426614174000",
    "checkpoints": [
      {
        "checkpoint_id": "chk1",
        "checkpoint_ns": "default",
        "created_at": "2025-01-22T09:00:05Z",
        "state": {
          "messages": [],
          "context": {},
          "step": "initial"
        },
        "metadata": {
          "trigger": "user_message",
          "version": "1.0"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing agentName or invalid parameters
- `404 Not Found`: Thread or agent not found
- `500 Internal Server Error`: Database query error

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE",
    "details": {
      // Additional error context
    }
  }
}
```

Common error codes:
- `AGENT_NOT_FOUND`: The specified agent does not exist
- `INVALID_PARAMETERS`: Request parameters are invalid or missing
- `DATABASE_ERROR`: Database query or connection failed
- `CONFIGURATION_ERROR`: Agent configuration is invalid or missing
- `INTERNAL_ERROR`: Unexpected server error

## Configuration

### Agent Configuration File

The agent configuration is stored as a YAML file in the GitHub registry and accessed via the `AGENT_CONFIG_ASSET_KEY`. The YAML structure is:

```yaml
agents:
  - name: "Agent 1 - Name"
    url: "http://localhost:3001/api/agent1"
    database_connection_string: "postgresql://username:password@working-postgresql.com:5432/agent1_data"
  
  - name: "Agent 2 - Name"
    url: "http://localhost:3002/api/agent2"
    database_connection_string: "postgresql://username:password@working-postgresql.com:5432/agent2_data"
```

#### YAML to API Response Transformation

When the API retrieves this YAML configuration, it performs the following transformations:

1. **Connection String Masking**: The database connection strings are processed to hide sensitive credentials:
   - Username: Shows first and last character with asterisks (e.g., `user` → `u**r`)
   - Password: Completely masked with asterisks
   - Example: `postgresql://user:password@localhost:5432/db` → `postgresql://u**r:********@localhost:5432/db`

2. **Response Structure**: The YAML array is wrapped in a standard API response format:
   ```json
   {
     "success": true,
     "agents": [...],  // Transformed agent array
     "count": 2        // Total number of agents
   }
   ```

3. **Error Handling**: If the YAML is malformed or the asset cannot be retrieved, appropriate error responses are generated with detailed error messages.

4. **Single Agent Queries**: When requesting a specific agent by name, the API filters the YAML array and returns only the matching agent in a singular response structure.

### Environment Variables

- `AGENT_CONFIG_ASSET_KEY`: **Required** - The asset key that identifies the YAML configuration file in the GitHub registry. This key is used to retrieve the agent configuration file that contains all agent definitions, URLs, and database connection strings.
- `CONFIG_GITHUB_REPO`: GitHub repository for asset loading (format: `owner/repo`)
- `CONFIG_GITHUB_TOKEN`: GitHub token for accessing private repositories
- `CONFIG_GITHUB_BRANCH`: the GitHub repository branch used for assets and configuration data

### Database Schema

The agent databases follow the LangGraph schema. When an API endpoint receives an `agentName` parameter, it:
1. Looks up the agent configuration from the cached YAML data
2. Retrieves the agent's `database_connection_string`
3. Establishes a connection pool to that specific database
4. Executes queries against the agent's database

#### Thread Table Schema

Used by: `GET /api/agent/threads` and `GET /api/agent/thread/:threadId/documents`

**Table Structure:**
```sql
thread (
  thread_id: UUID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  metadata: JSONB,
  status: TEXT,
  config: JSONB,
  values: JSONB,      -- Contains messages, retrieved_docs, and other thread data
  interrupts: JSONB
)
```

**Data Transformations:**
- UUIDs are cast to strings in API responses
- The `values` field contains the conversation messages and retrieved documents
- When `include_retrieved_docs=false`, the `retrieved_docs` property is removed from the `values` object
- Timestamps are returned in ISO 8601 format

#### Run Table Schema

Used by: `GET /api/agent/thread/:threadId/runs`

**Table Structure:**
```sql
run (
  run_id: UUID,
  thread_id: UUID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  status: TEXT,
  metadata: JSONB,
  kwargs: JSONB,           -- Aliased as 'config' in API response
  assistant_id: TEXT,
  multitask_strategy: TEXT
)
```

**Data Transformations:**
- UUIDs are cast to strings
- The `kwargs` field is renamed to `config` in the API response
- Results are filtered by `thread_id` and ordered by `created_at DESC`

#### Checkpoints Table Schema

Used by: `GET /api/agent/thread/:threadId/checkpoints`

**Table Structure:**
```sql
checkpoints (
  thread_id: UUID,
  checkpoint_id: UUID,
  run_id: UUID,
  parent_checkpoint_id: UUID,
  checkpoint: JSONB,      -- Contains the actual checkpoint state
  metadata: JSONB,
  checkpoint_ns: TEXT     -- Namespace for checkpoint organization
)
```

**Data Transformations:**
- UUIDs are cast to strings
- The `checkpoint` field contains the full state snapshot
- Results are filtered by `thread_id`

#### Database Connection Process

1. **Agent Lookup**: When an API request includes `agentName`, the system:
   - Searches the cached agent configuration for a matching name
   - Retrieves the agent's `database_connection_string`
   - Returns 404 if the agent is not found

2. **Connection Pooling**: Each agent has its own database connection pool:
   - Pools are created on first use and cached
   - Pool configuration includes SSL settings, timeouts, and retry logic
   - Connection strings are masked in logs for security

3. **Query Execution**: Queries are executed against the agent-specific database:
   - All queries include proper error handling
   - Pagination is implemented using LIMIT and OFFSET
   - Total counts are calculated separately for pagination metadata

4. **Response Formatting**: Database results are transformed into standardized API responses:
   - Consistent pagination structure across all endpoints
   - Proper error messages without exposing sensitive connection details
   - Success flags and appropriate HTTP status codes

### Security Considerations

1. **Connection String Masking**: Database connection strings are automatically masked in all API responses
2. **Input Validation**: All inputs are validated to prevent SQL injection
3. **Error Messages**: Sensitive information is never exposed in error messages
4. **Rate Limiting**: Consider implementing rate limiting for production deployments

### Performance Optimization

1. **Pagination**: All list endpoints support pagination to handle large datasets
2. **Query Optimization**: Database queries use indexes for efficient data retrieval
3. **Connection Pooling**: Database connections are pooled for better performance
4. **Caching**: Consider implementing caching for frequently accessed data

### Monitoring and Logging

The API includes comprehensive logging for:
- Request/response tracking
- Error conditions
- Performance metrics
- Database query execution times

Logs are structured in JSON format for easy parsing and analysis.