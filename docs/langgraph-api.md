# LangGraph API Database Schema Documentation

This document provides a comprehensive overview of the database schema used by the agents API endpoints in the OWUI Feedback Monitor application. The schema is designed to support LangGraph-based agent interactions, conversation management, and state persistence.

## Important Note: Read-Only Access

**This application operates in READ-ONLY mode. We do not create, modify, or delete any database tables, indexes, or data. All database operations are strictly limited to SELECT queries for data retrieval.**

## Overview

The agents API connects to PostgreSQL databases containing conversation threads, execution runs, and checkpoints from LangGraph agents. The schema supports multiple agent configurations, each with its own database connection. The application assumes these databases and tables already exist and are managed by the LangGraph system.

## Database Tables (Existing Schema)

**Note**: The following table definitions show the expected schema that must already exist in the LangGraph databases. Our application does not create these tables - it only reads from them.

### 1. Thread Table

The `thread` table is the primary entity representing a conversation or interaction session.

```sql
-- This table must already exist in the LangGraph database
-- We only perform SELECT queries on this table
CREATE TABLE thread (
    thread_id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    metadata JSONB,
    status VARCHAR,
    config JSONB,
    values JSONB,
    interrupts JSONB
);
```

**Field Descriptions:**

- **thread_id** (UUID): Unique identifier for each conversation thread
- **created_at** (TIMESTAMP): Timestamp when the thread was created
- **updated_at** (TIMESTAMP): Timestamp of the last modification to the thread
- **metadata** (JSONB): Flexible JSON storage for thread-specific metadata
- **status** (VARCHAR): Current status of the thread (e.g., 'active', 'completed', 'interrupted')
- **config** (JSONB): Configuration settings specific to this thread
- **values** (JSONB): JSON object containing thread state data, including:
  - `retrieved_docs`: Array of documents retrieved during the conversation
  - Other custom values specific to the agent implementation
- **interrupts** (JSONB): Storage for interrupt handling and breakpoint information

### 2. Run Table

The `run` table tracks individual execution runs within a thread.

```sql
-- This table must already exist in the LangGraph database
-- We only perform SELECT queries on this table
CREATE TABLE run (
    run_id UUID,
    thread_id UUID REFERENCES thread(thread_id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    status VARCHAR,
    metadata JSONB,
    kwargs JSONB,
    assistant_id UUID,
    multitask_strategy VARCHAR
);
```

**Field Descriptions:**

- **run_id** (UUID): Unique identifier for each run
- **thread_id** (UUID): Foreign key linking to the parent thread
- **created_at** (TIMESTAMP): Timestamp when the run was initiated
- **updated_at** (TIMESTAMP): Timestamp of the last update to the run
- **status** (VARCHAR): Current status of the run (e.g., 'running', 'completed', 'failed')
- **metadata** (JSONB): Run-specific metadata
- **kwargs** (JSONB): Configuration and arguments passed to the run (exposed as `config` in API responses)
- **assistant_id** (UUID): Identifier of the assistant handling this run
- **multitask_strategy** (VARCHAR): Strategy for handling multiple concurrent tasks

### 3. Checkpoints Table

The `checkpoints` table stores state snapshots for recovery and versioning.

```sql
-- This table must already exist in the LangGraph database
-- We only perform SELECT queries on this table
CREATE TABLE checkpoints (
    thread_id UUID REFERENCES thread(thread_id),
    checkpoint_id UUID,
    run_id UUID,
    parent_checkpoint_id UUID,
    checkpoint JSONB,
    metadata JSONB,
    checkpoint_ns VARCHAR,
    PRIMARY KEY (thread_id, checkpoint_id)
);
```

**Field Descriptions:**

- **thread_id** (UUID): Foreign key to the associated thread
- **checkpoint_id** (UUID): Unique identifier for this checkpoint
- **run_id** (UUID): Associated run ID if applicable
- **parent_checkpoint_id** (UUID): Reference to parent checkpoint for versioning
- **checkpoint** (JSONB): The actual checkpoint data (state snapshot)
- **metadata** (JSONB): Checkpoint-specific metadata
- **checkpoint_ns** (VARCHAR): Namespace for checkpoint organization

## Query Patterns (Read-Only)

All queries are SELECT statements only. We never perform INSERT, UPDATE, DELETE, or any DDL operations.

### Thread Queries

1. **List Threads with Pagination**
```sql
SELECT 
    thread_id::text,
    created_at,
    updated_at,
    metadata,
    status,
    config,
    values,
    interrupts
FROM thread
WHERE created_at >= $1 AND created_at <= $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;
```

2. **Get Thread by ID**
```sql
SELECT 
    thread_id::text,
    created_at,
    updated_at,
    metadata,
    status,
    config,
    values,
    interrupts
FROM thread
WHERE thread_id = $1::uuid;
```

3. **Get Thread Documents**
```sql
SELECT 
    thread_id::text,
    values->'retrieved_docs' as documents
FROM thread
WHERE thread_id = $1::uuid
    AND values->'retrieved_docs' IS NOT NULL;
```

### Run Queries

1. **Get Runs for Thread**
```sql
SELECT 
    run_id::text,
    thread_id::text,
    created_at,
    updated_at,
    status,
    metadata,
    kwargs as config,
    assistant_id::text,
    multitask_strategy
FROM run
WHERE thread_id = $1::uuid
ORDER BY created_at DESC;
```

### Checkpoint Queries

1. **Get All Checkpoints for Thread**
```sql
SELECT 
    checkpoint_id::text,
    thread_id::text,
    run_id::text,
    parent_checkpoint_id::text,
    checkpoint,
    metadata,
    checkpoint_ns
FROM checkpoints
WHERE thread_id = $1::uuid
ORDER BY checkpoint_id DESC
LIMIT $2 OFFSET $3;
```

2. **Get Checkpoints by Namespace**
```sql
SELECT 
    checkpoint_id::text,
    thread_id::text,
    run_id::text,
    parent_checkpoint_id::text,
    checkpoint,
    metadata,
    checkpoint_ns
FROM checkpoints
WHERE thread_id = $1::uuid
    AND checkpoint_ns = $2
ORDER BY checkpoint_id DESC
LIMIT $3 OFFSET $4;
```

3. **Get Latest Checkpoint (with optional namespace)**
```sql
SELECT 
    checkpoint_id::text,
    thread_id::text,
    run_id::text,
    parent_checkpoint_id::text,
    checkpoint,
    metadata,
    checkpoint_ns
FROM checkpoints
WHERE thread_id = $1::uuid
    AND ($2::text IS NULL OR checkpoint_ns = $2)
ORDER BY checkpoint_id DESC
LIMIT 1;
```

## Database Configuration

### Connection Management

- **Connection Pooling**: Maximum of 10 connections per agent database
- **SSL Support**: Configurable SSL mode for secure connections (required for Azure PostgreSQL)
- **Connection Timeout**: 30 seconds default timeout
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s delays)

### Environment Variables

- `DATABASE_VERBOSE`: Set to 'true' to enable detailed query logging
- `NODE_ENV`: Affects SSL configuration (production enables SSL by default)

## Data Types and Conventions

### UUID Handling
- All UUID fields are stored as native PostgreSQL UUID type
- UUIDs are cast to text in SELECT queries for API compatibility: `thread_id::text`
- Input UUIDs are cast from text: `$1::uuid`

### Timestamp Format
- All timestamps use ISO 8601 format
- Timezone handling follows PostgreSQL server configuration
- Date filtering supports both `fromDate` and `toDate` parameters

### JSONB Fields
- Flexible schema allowing agent-specific extensions
- Accessed using PostgreSQL JSON operators: `->` for object access, `->>` for text extraction
- Common paths:
  - `values->'retrieved_docs'`: Document array
  - `metadata->'user_id'`: User identification
  - `config->'model'`: Model configuration

## Expected Indexes

**Note**: These indexes should already exist in the LangGraph database for optimal query performance. We do not create these indexes - we only benefit from them if they exist.

```sql
-- These indexes are expected to exist in the LangGraph database
-- for optimal performance of our read queries:

-- Primary key indexes (should be automatically created by LangGraph)
-- thread(thread_id)
-- checkpoints(thread_id, checkpoint_id)

-- Performance indexes that improve our query performance if present:
-- idx_thread_created_at ON thread(created_at DESC)
-- idx_thread_updated_at ON thread(updated_at DESC)
-- idx_run_thread_id ON run(thread_id)
-- idx_run_created_at ON run(created_at DESC)
-- idx_checkpoints_thread_id ON checkpoints(thread_id)

-- JSONB indexes for document queries if present:
-- idx_thread_values_docs ON thread USING GIN ((values->'retrieved_docs'))
```

## Agent Configuration

### Configuration File Format

Agents are configured through a YAML file that defines the list of available agents and their connection details. This file is retrieved from the GitHub asset repository using the asset key specified in the `AGENT_CONFIG_ASSET_KEY` environment variable.

#### YAML Structure

```yaml
agents:
  - name: "Agent 1 - Name"
    url: "http://localhost:3001/api/agent1"
    database_connection_string: "postgresql://username:password@working-postgresql.com:5432/agent1_data"
  
  - name: "Agent 2 - Name"
    url: "http://localhost:3002/api/agent2"
    database_connection_string: "postgresql://username:password@working-postgresql.com:5432/agent2_data"
  
  - name: "Production Agent"
    url: "https://api.production.com/agent"
    database_connection_string: "postgresql://readonly_user:password@prod-db.com:5432/agent_data?sslmode=require"
```

#### Configuration Fields

- **name**: Unique identifier for the agent. This name is used as the `agentName` parameter in all API calls
- **url**: The HTTP endpoint URL for the agent's API (currently not used by the monitoring application)
- **database_connection_string**: PostgreSQL connection string with read-only credentials

### Configuration Loading Process

1. **Primary Source**: GitHub Asset Repository
   - Asset key: Value from `AGENT_CONFIG_ASSET_KEY` environment variable
   - Format: YAML text content
   - Retrieved via the asset API

2. **Fallback Sources** (in order):
   - Database asset storage (if GitHub is unavailable)
   - Local file: `agent-config.yaml` in the project root

3. **Hot Reload Support**
   - Configuration can be reloaded without restarting the application
   - Triggered via `POST /api/agent/reload` endpoint

### Agent Name Usage

The agent name from the configuration file is the key parameter used throughout the API:

#### API Endpoints Requiring Agent Name

1. **Thread Operations**
   ```
   GET /api/agent/threads?agentName=Agent 1 - Name&limit=50
   ```

2. **Connection Testing**
   ```
   GET /api/agent/test-connection?agentName=Agent 1 - Name
   ```

3. **All thread-specific operations** use the agent name to identify which database to query:
   - The agent name is passed in the query parameters
   - The service looks up the connection string for that agent
   - A connection pool is created/reused for that specific agent

#### Example API Calls

```bash
# List threads for a specific agent
curl "http://localhost:3001/api/agent/threads?agentName=Agent%201%20-%20Name&limit=10"

# Get documents for a thread (agent name required)
curl "http://localhost:3001/api/agent/thread/123/documents?agentName=Agent%201%20-%20Name"

# Get runs for a thread
curl "http://localhost:3001/api/agent/thread/123/runs?agentName=Agent%201%20-%20Name"

# Test agent connection
curl "http://localhost:3001/api/agent/test-connection?agentName=Agent%201%20-%20Name"
```

### Configuration Schema

```typescript
interface AgentConfig {
    name: string;                    // Unique agent identifier
    url: string;                     // Agent API endpoint
    database_connection_string: string; // PostgreSQL connection string
}

interface AgentConfigFile {
    agents: AgentConfig[];          // Array of agent configurations
}
```

### Connection String Format
```
postgresql://username:password@host:port/database?sslmode=require
```

### Environment Configuration

Required environment variables:
- `AGENT_CONFIG_ASSET_KEY`: The asset key in GitHub repository (e.g., "agent-config.yaml")
- `GITHUB_TOKEN`: GitHub access token for retrieving private assets
- `GITHUB_REPO`: Repository containing the configuration (format: "owner/repo")

### Security Considerations

1. **Credentials Management**
   - Use read-only database users in connection strings
   - Store sensitive configuration in private GitHub repositories
   - Consider using environment variable substitution for passwords

2. **Connection String Security**
   - Connection strings are masked in logs
   - Never expose full connection strings in API responses
   - Use SSL/TLS connections in production (`sslmode=require`)

3. **Access Control**
   - Agent names should not contain sensitive information
   - Validate agent names in API requests
   - Implement proper authentication for configuration reload

## Security Considerations

1. **Connection Security**
   - Always use SSL for production connections
   - Store credentials in secure configuration management
   - Implement connection string encryption at rest

2. **Query Safety**
   - All queries use parameterized statements to prevent SQL injection
   - UUID validation prevents malformed input
   - JSONB queries are sanitized
   - **All queries are read-only SELECT statements**

3. **Access Control**
   - **Database users MUST have read-only permissions**
   - **GRANT SELECT ON ALL TABLES is sufficient**
   - **No write permissions (INSERT, UPDATE, DELETE) are needed**
   - **No DDL permissions (CREATE, ALTER, DROP) are needed**
   - Separate read-only credentials per agent recommended

## Performance Optimization

1. **Query Optimization**
   - Use pagination for large result sets (default limit: 100)
   - Implement appropriate indexes for common query patterns
   - Monitor slow query logs

2. **Connection Pool Tuning**
   - Adjust pool size based on concurrent user load
   - Monitor connection wait times
   - Implement connection timeout handling

3. **JSONB Performance**
   - Use GIN indexes for frequently queried JSON paths
   - Consider partial indexes for specific value conditions
   - Extract frequently accessed fields to columns if needed

## Database Administration Notes

**Important**: All maintenance activities should be performed by the LangGraph system administrators, not by this monitoring application.

1. **Performance Monitoring**
   - Monitor slow SELECT queries from our application
   - Track connection pool usage
   - Alert on connection failures

2. **Access Requirements**
   - Our application requires only SELECT permissions
   - No maintenance operations are performed by our application
   - Database maintenance is the responsibility of the LangGraph system

3. **Connection Monitoring**
   - Track active connections from our monitoring application
   - Ensure connection limits are not exceeded
   - Monitor for connection timeouts

## Backend Services Architecture

This section describes the services that interact with the database tables and how they work together to provide the agents API functionality.

### Service Layer Overview

The backend implements a layered architecture with clear separation of concerns:

```
┌─────────────────┐
│   API Routes    │  ← HTTP endpoints
├─────────────────┤
│ Agent Service   │  ← Business logic
├─────────────────┤
│Database Service │  ← Data access
├─────────────────┤
│   PostgreSQL    │  ← Data storage
└─────────────────┘
```

### 1. Database Service

**Location**: `/backend/src/services/database.service.ts`

The core service responsible for all database interactions with agent databases.

#### Key Features:

- **Connection Pool Management**
  - Maintains separate connection pools for each agent
  - Maximum 10 connections per pool
  - 30-second idle timeout for connections
  - Automatic pool cleanup on process termination

- **Azure PostgreSQL Support**
  - Special SSL configuration for Azure environments
  - Automatic SSL certificate handling
  - Production-ready security settings

- **Read-Only Query Operations**
  ```typescript
  // All operations are read-only SELECT queries
  
  // Get paginated threads with optional date filtering
  async getThreads(agent: Agent, params: {
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<Thread[]>

  // Get documents from a specific thread
  async getThreadDocuments(agent: Agent, threadId: string): Promise<any>

  // Get all runs for a thread
  async getThreadRuns(agent: Agent, threadId: string): Promise<Run[]>

  // Get checkpoints for a thread
  async getThreadCheckpoints(agent: Agent, threadId: string, params?: {
    namespace?: string;
    limit?: number;
  }): Promise<Checkpoint[]>
  ```

- **Error Handling**
  - Retry logic with exponential backoff (3 attempts)
  - Detailed error logging with connection diagnostics
  - Sensitive data masking in error messages

- **Performance Features**
  - Query timeout protection (30 seconds)
  - Optional verbose logging via `DATABASE_VERBOSE=true`
  - Efficient pagination support
  - Selective field exclusion for large data

### 2. Agent Service

**Location**: `/backend/src/services/agent.service.ts`

Manages agent configurations and provides the business logic layer.

#### Responsibilities:

- **Agent Management**
  ```typescript
  // Get all configured agents
  getAgents(): Agent[]

  // Get specific agent by name
  getAgentByName(name: string): Agent | undefined

  // Reload agent configuration
  async reloadAgents(): Promise<void>
  ```

- **Configuration Mapping**
  - Transforms configuration data to `Agent` type
  - Validates agent configurations
  - Handles configuration updates

- **No Direct Database Access**
  - Acts as intermediary between routes and database service
  - Provides clean abstraction for agent operations

### 3. Configuration Services

**Location**: `/backend/src/services/config/`

Handle various configuration sources and provide fallback mechanisms.

#### Database Asset Service (`config-clients.ts`)

- **Asset Storage**
  - Uses `@biks2013/asset-database` package
  - Stores configurations in separate database
  - Connection via `DATABASE_URL` environment variable

- **Asset Categories**
  - `configuration`: General app configuration
  - `agent-config`: Agent-specific configurations
  - `prompt-templates`: LLM prompt templates

- **Caching**
  - 5-minute TTL for asset cache
  - Automatic cache invalidation
  - Memory-efficient storage

#### Agent Config Service (`agentConfigService.ts`)

- **Configuration Sources** (in priority order):
  1. GitHub repository (via `AGENT_CONFIG_ASSET_KEY`)
  2. Database assets (fallback)
  3. Local file system (`agent-config.yaml`)

- **Features**
  - Hot reload support
  - YAML and JSON format support
  - Environment-specific configurations

### 4. API Routes

**Location**: `/backend/src/routes/agent.routes.ts`

RESTful endpoints exposing agent functionality.

#### Endpoints:

1. **Agent Management**
   - `GET /api/agent` - List all configured agents
   - `GET /api/agent/:name` - Get specific agent details
   - `POST /api/agent/reload` - Reload agent configurations

2. **Thread Operations**
   - `GET /api/agent/threads` - Fetch threads with pagination
     ```
     Query parameters:
     - agentName: string (required)
     - limit: number (default: 100)
     - offset: number (default: 0)
     - fromDate: ISO 8601 date
     - toDate: ISO 8601 date
     ```

3. **Thread Details**
   - `GET /api/agent/thread/:threadId/documents` - Get thread documents
     ```
     Query parameters:
     - agentName: string (required)
     ```
   
   - `GET /api/agent/thread/:threadId/runs` - Get execution runs
     ```
     Query parameters:
     - agentName: string (required)
     ```
   
   - `GET /api/agent/thread/:threadId/checkpoints` - Get state checkpoints
     ```
     Query parameters:
     - agentName: string (required)
     - namespace: string (optional) - Filter by checkpoint namespace
     - limit: number (default: 100) - Max results to return
     - offset: number (default: 0) - Pagination offset
     - latest: boolean (default: false) - Return only the latest checkpoint
     ```

4. **Utilities**
   - `GET /api/agent/test-connection` - Test database connectivity

### 5. Data Flow Examples

#### Thread Retrieval Flow:
```
1. Client Request: GET /api/agent/threads?agentName=myAgent&limit=50
2. Route Handler validates parameters
3. Agent Service retrieves agent configuration
4. Database Service executes query:
   SELECT thread_id::text, created_at, updated_at, ...
   FROM thread
   ORDER BY created_at DESC
   LIMIT 50
5. Results transformed and returned to client
```

#### Document Retrieval Flow:
```
1. Client Request: GET /api/agent/thread/123/documents
2. Route Handler extracts threadId
3. Agent Service provides agent config
4. Database Service queries:
   SELECT values->'retrieved_docs'
   FROM thread
   WHERE thread_id = '123'::uuid
5. JSON data extracted and returned
```

### 6. Service Integration Patterns

#### Configuration Loading:
```typescript
// On startup or reload
1. ConfigurationService loads from GitHub/Database
2. AgentConfigService parses YAML/JSON
3. AgentService validates and stores in memory
4. Database Service initializes connection pools
```

#### Request Processing:
```typescript
// For each API request
1. Express route receives HTTP request
2. Route handler validates input
3. Agent Service locates agent config
4. Database Service executes query
5. Results formatted and returned
```

### 7. Error Handling Strategy

The services implement a comprehensive error handling approach:

1. **Database Errors**
   - Connection failures trigger retry logic
   - Query errors return descriptive messages
   - Timeout protection prevents hanging

2. **Configuration Errors**
   - Missing configs return 404
   - Invalid configs logged and rejected
   - Fallback to defaults where appropriate

3. **API Errors**
   - Consistent error response format
   - Appropriate HTTP status codes
   - Detailed error messages in development

### 8. Monitoring and Observability

#### Logging:
- Structured logging with context
- Query performance tracking
- Connection pool statistics
- Error rate monitoring

#### Metrics:
- Database connection pool usage
- Query execution times
- API endpoint latencies
- Configuration reload events

#### Health Checks:
- Database connectivity tests
- Configuration validity checks
- Memory usage monitoring
- Connection pool health

### 9. Security Implementation

1. **Connection Security**
   - SSL/TLS enforced for production
   - Connection string encryption
   - Credential rotation support

2. **API Security**
   - Asset access validation
   - Request parameter sanitization
   - Rate limiting ready

3. **Data Protection**
   - Sensitive data masking in logs
   - Parameterized queries only
   - No credential exposure in errors
   - **Read-only access prevents data modification**
   - **No write operations performed**

### 10. Performance Optimizations

1. **Connection Management**
   - Connection pooling reduces overhead
   - Idle connection cleanup
   - Optimal pool sizing

2. **Query Optimization**
   - Prepared statement caching
   - Selective field retrieval
   - Efficient pagination

3. **Caching Strategy**
   - Configuration caching
   - Asset content caching
   - Memory-efficient storage

## API Response Formats

### TypeScript Interfaces

```typescript
// Thread response structure
interface Thread {
  thread_id: string;
  created_at: string;  // ISO 8601 format
  updated_at: string;  // ISO 8601 format
  metadata?: Record<string, any>;
  status?: string;
  config?: Record<string, any>;
  values?: {
    retrieved_docs?: Array<{
      page_content: string;
      metadata?: Record<string, any>;
    }>;
    [key: string]: any;
  };
  interrupts?: Record<string, any>;
}

// Run response structure
interface Run {
  run_id: string;
  thread_id: string;
  created_at: string;  // ISO 8601 format
  updated_at: string;  // ISO 8601 format
  status?: string;
  metadata?: Record<string, any>;
  config?: Record<string, any>;  // Mapped from 'kwargs' field
  assistant_id?: string;
  multitask_strategy?: string;
}

// Checkpoint response structure
interface Checkpoint {
  checkpoint_id: string;
  thread_id: string;
  run_id?: string;
  parent_checkpoint_id?: string;
  checkpoint?: Record<string, any>;
  metadata?: Record<string, any>;
  checkpoint_ns?: string;
}

// Agent response structure
interface Agent {
  name: string;
  url: string;
  database_connection_string?: string;  // Omitted in API responses
}

// Paginated response wrapper
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total?: number;  // Optional, if count query is implemented
  };
}

// Error response structure
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;  // ISO 8601 format
  };
}

// Success response for operations
interface SuccessResponse {
  success: boolean;
  message?: string;
  data?: any;
}
```

### API Response Examples

#### Successful Thread List Response
```json
{
  "data": [
    {
      "thread_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:45:00Z",
      "metadata": {
        "user_id": "user123",
        "session_type": "support"
      },
      "status": "completed",
      "config": {
        "model": "gpt-4",
        "temperature": 0.7
      },
      "values": {
        "retrieved_docs": [
          {
            "page_content": "Document content here...",
            "metadata": {
              "source": "knowledge_base.pdf",
              "page": 5
            }
          }
        ]
      },
      "interrupts": {}
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### Error Response Example
```json
{
  "error": {
    "code": "DATABASE_CONNECTION_ERROR",
    "message": "Failed to connect to agent database",
    "details": {
      "agent": "Agent 1 - Name",
      "attempt": 3,
      "lastError": "Connection timeout"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Validation Rules

### Input Validation

1. **UUID Validation**
   ```typescript
   const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   
   function isValidUUID(uuid: string): boolean {
     return UUID_REGEX.test(uuid);
   }
   ```

2. **Date Validation**
   - Accept ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
   - Support date-only format: `YYYY-MM-DD`
   - Validate date ranges: `fromDate` must be before `toDate`

3. **Pagination Validation**
   - `limit`: Min 1, Max 1000, Default 100
   - `offset`: Min 0, Default 0
   - Reject negative values

4. **Agent Name Validation**
   - Must be non-empty string
   - Must match an existing agent in configuration
   - Case-sensitive matching

### Parameter Constraints

```typescript
const VALIDATION_RULES = {
  pagination: {
    limit: { min: 1, max: 1000, default: 100 },
    offset: { min: 0, default: 0 }
  },
  dates: {
    format: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/,
    maxRange: 365 * 24 * 60 * 60 * 1000  // 1 year in milliseconds
  },
  agentName: {
    maxLength: 255,
    pattern: /^[^\x00-\x1F\x7F]+$/  // No control characters
  },
  threadId: {
    format: UUID_REGEX
  }
};
```

## Data Transformations

### Database to API Transformations

1. **UUID Casting**
   - All UUID fields cast to string in SELECT queries
   - Example: `thread_id::text`

2. **Field Mapping**
   - Database `kwargs` → API `config` (in Run table)
   - Null values preserved as null, not omitted

3. **JSONB Handling**
   - JSONB fields returned as parsed objects
   - Empty JSONB returned as `{}` not null

4. **Timestamp Formatting**
   - All timestamps converted to ISO 8601 with timezone
   - Database timezone converted to UTC

### Response Filtering

```typescript
// Fields to exclude from API responses
const SENSITIVE_FIELDS = [
  'database_connection_string'  // Never expose in agent responses
];

// Optional field exclusion for performance
interface FieldOptions {
  includeDocuments?: boolean;  // Default: true
  includeCheckpoints?: boolean;  // Default: false
  includeMetadata?: boolean;  // Default: true
}
```

## Environment Variables

### Required Environment Variables

```bash
# Database Configuration
NODE_ENV=development|staging|production
DATABASE_URL=postgresql://user:pass@host:port/config_db  # For config storage
DATABASE_VERBOSE=true|false  # Enable query logging (default: false)

# Agent Configuration
AGENT_CONFIG_ASSET_KEY=agent-config.yaml  # Asset key in GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxx  # GitHub access token
GITHUB_REPO=owner/repository  # Repository containing configs

# API Configuration
PORT=3001  # Server port (default: 3001)
API_BASE_PATH=/api  # API base path (default: /api)
API_ACCESSIBLE_ASSETS_PREFIX=public-  # Asset security prefix

# Security
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origins
SSL_REJECT_UNAUTHORIZED=0  # For development only

# Performance
CONNECTION_POOL_MAX=10  # Max connections per agent (default: 10)
QUERY_TIMEOUT=30000  # Query timeout in ms (default: 30000)
CONNECTION_TIMEOUT=30000  # Connection timeout in ms (default: 30000)

# Logging
LOG_LEVEL=debug|info|warn|error  # Logging level (default: info)
```

### Optional Environment Variables

```bash
# Monitoring
ENABLE_METRICS=true|false  # Enable metrics collection
METRICS_PORT=9090  # Metrics endpoint port

# Development
DISABLE_SSL=true|false  # Disable SSL for local development
MOCK_DATABASE=true|false  # Use mock data instead of real DB
```

## Error Handling Details

### Error Codes and HTTP Status Mapping

```typescript
enum ErrorCode {
  // 400 Bad Request
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  INVALID_UUID = 'INVALID_UUID',
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  MISSING_REQUIRED_PARAMETER = 'MISSING_REQUIRED_PARAMETER',
  
  // 404 Not Found
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  NO_DOCUMENTS_FOUND = 'NO_DOCUMENTS_FOUND',
  
  // 500 Internal Server Error
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // 503 Service Unavailable
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT'
}

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  INVALID_PARAMETERS: 400,
  INVALID_UUID: 400,
  INVALID_DATE_FORMAT: 400,
  INVALID_DATE_RANGE: 400,
  MISSING_REQUIRED_PARAMETER: 400,
  AGENT_NOT_FOUND: 404,
  THREAD_NOT_FOUND: 404,
  NO_DOCUMENTS_FOUND: 404,
  DATABASE_CONNECTION_ERROR: 500,
  DATABASE_QUERY_ERROR: 500,
  CONFIGURATION_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  DATABASE_TIMEOUT: 503
};
```

### Error Response Examples

```typescript
// 400 Bad Request - Invalid UUID
{
  "error": {
    "code": "INVALID_UUID",
    "message": "Invalid thread ID format",
    "details": {
      "field": "threadId",
      "value": "not-a-uuid",
      "expected": "UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// 404 Not Found - Agent not found
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent not found in configuration",
    "details": {
      "agentName": "Unknown Agent",
      "availableAgents": ["Agent 1 - Name", "Agent 2 - Name"]
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

// 500 Internal Server Error - Database error
{
  "error": {
    "code": "DATABASE_QUERY_ERROR",
    "message": "Failed to execute database query",
    "details": {
      "query": "getThreads",
      "error": "relation \"thread\" does not exist"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Testing Strategy

### Unit Testing Approach

```typescript
// Mock database responses for testing
const mockThreads: Thread[] = [
  {
    thread_id: "550e8400-e29b-41d4-a716-446655440000",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T11:45:00Z",
    metadata: { test: true },
    status: "completed",
    config: {},
    values: {},
    interrupts: {}
  }
];

// Test categories
1. Service Layer Tests
   - Agent configuration loading
   - Database connection pool management
   - Query parameter validation
   - Error handling and retry logic

2. API Route Tests
   - HTTP status codes
   - Response format validation
   - Parameter validation
   - Error response format

3. Integration Tests
   - End-to-end API calls
   - Database connectivity
   - Configuration loading
   - Connection pool behavior
```

### Testing Read-Only Constraints

```sql
-- Test script to verify read-only access
-- This should fail if permissions are correctly set
BEGIN;
  -- Attempt to insert (should fail)
  INSERT INTO thread (thread_id) VALUES (gen_random_uuid());
ROLLBACK;

-- Verify SELECT works
SELECT COUNT(*) FROM thread;
```

## Express.js Middleware Stack

### Middleware Order and Configuration

The Express.js application should configure middleware in the following order for optimal security and functionality:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

const app = express();

// 1. Security Headers (First for protection)
app.use(helmet({
  contentSecurityPolicy: false, // Disable if serving dynamic content
  crossOriginEmbedderPolicy: false
}));

// 2. CORS (Early to handle preflight requests)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// 3. Request Logging (Before body parsing for accurate timing)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Response Compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Default compression level
}));

// 5. Body Parsing
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf-8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Request Timeout
app.use((req, res, next) => {
  // Set timeout for all requests
  req.setTimeout(parseInt(process.env.REQUEST_TIMEOUT || '120000'), () => {
    res.status(408).json({
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timeout',
        timestamp: new Date().toISOString()
      }
    });
  });
  next();
});

// 7. Custom Request ID (for tracking)
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// 8. API Routes (Protected by all previous middleware)
app.use('/api/agent', agentRoutes);
app.use('/api/asset', assetRoutes);
app.use('/api/configuration', configurationRoutes);

// 9. 404 Handler (After all routes)
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString()
    }
  });
});

// 10. Global Error Handler (Last middleware)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error details
  console.error(`Error ${req.id}:`, err);

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: isDev ? err.stack : undefined,
      timestamp: new Date().toISOString()
    }
  });
});
```

### Middleware Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0"
  }
}
```

### Custom Validation Middleware

For input validation on specific routes:

```typescript
// Validation middleware factory
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query || req.body || req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

// Usage in routes
router.get('/threads', 
  validateRequest(threadQuerySchema),
  async (req, res, next) => {
    // Route handler
  }
);
```

### Rate Limiting (Optional)

If rate limiting is needed:

```typescript
import rateLimit from 'express-rate-limit';

// Apply rate limiting before routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP',
      timestamp: new Date().toISOString()
    }
  }
});

app.use('/api/', limiter);
```

## Implementation Checklist

### Core Components
- [ ] Database service with connection pooling
- [ ] Agent service for configuration management
- [ ] Agent configuration loading from GitHub
- [ ] Error handling middleware
- [ ] Input validation middleware
- [ ] Response formatting utilities

### API Endpoints
- [ ] GET /api/agent - List all agents
- [ ] GET /api/agent/:name - Get agent details
- [ ] GET /api/agent/threads - List threads with pagination
- [ ] GET /api/agent/thread/:threadId/documents - Get documents
- [ ] GET /api/agent/thread/:threadId/runs - Get runs
- [ ] GET /api/agent/thread/:threadId/checkpoints - Get checkpoints
- [ ] GET /api/agent/test-connection - Test database connection
- [ ] POST /api/agent/reload - Reload configuration

### Supporting Features
- [ ] Connection pool management per agent
- [ ] SSL support for Azure PostgreSQL
- [ ] Retry logic with exponential backoff
- [ ] Query timeout protection
- [ ] Verbose logging mode
- [ ] Error response standardization
- [ ] Input validation for all parameters
- [ ] Response data transformation
- [ ] Sensitive data masking in logs

## Future Considerations

1. **Schema Evolution**
   - JSONB fields allow flexible schema updates
   - Consider versioning for breaking changes
   - Maintain backward compatibility

2. **Scalability**
   - Partition large tables by date if needed
   - Consider read replicas for heavy query loads
   - Implement caching for frequently accessed data

3. **Integration Points**
   - Webhook notifications for real-time updates
   - Event streaming for audit logs
   - API versioning for client compatibility