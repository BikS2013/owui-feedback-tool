# Backend API Documentation

This document provides comprehensive documentation for all API endpoints in the backend service.

## Base URL

The backend service runs on `http://localhost:3001` by default. The port can be configured via the `PORT` environment variable.

## API Documentation

Swagger UI documentation is available at: `http://localhost:3001/api-docs`

## CORS Configuration

The backend supports configurable CORS origins through environment variables:
- `CORS_ORIGINS` or `CORS_ORIGIN`: Comma-separated list of allowed origins
- Default: `http://localhost:5173`
- Wildcard support: Set to `*` to allow all origins

## Health Check

### GET /health

Health check endpoint to verify server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T10:30:00Z"
}
```

---

## Configuration Endpoint

### GET /config.json

Root-level configuration endpoint for frontend discovery. Returns the API base URL in a format compatible with the frontend's configuration loader.

**Response:**
```json
{
  "api": {
    "baseUrl": "http://localhost:3001"
  }
}
```

**Notes:**
- The `baseUrl` is determined from the `API_BASE_URL` environment variable or auto-detected from the request
- This endpoint is used by the frontend to discover the API location at runtime
- No authentication required

---

## Export Routes

Base path: `/api/export`

### POST /api/export/conversation

Export a conversation to PDF or HTML format.

**Request Body:**
```json
{
  "conversation": {
    "id": "string",
    "title": "string",
    "userId": "string",
    "createdAt": "2025-01-08T10:30:00Z",
    "updatedAt": "2025-01-08T10:30:00Z",
    "messages": [
      {
        "id": "string",
        "role": "user | assistant",
        "content": "string",
        "timestamp": 1234567890,
        "userId": "string (optional)",
        "model": "string (optional)",
        "modelName": "string (optional)",
        "parentId": "string | null (optional)",
        "childrenIds": ["string"] // optional
      }
    ],
    "qaPairCount": 0,
    "totalRatings": 0,
    "averageRating": null,
    "modelsUsed": ["string"]
  },
  "qaPairs": [
    {
      "id": "string",
      "conversationId": "string",
      "question": { /* Message object */ },
      "answer": { /* Message object */ },
      "rating": null,
      "sentiment": 1 | -1 | null,
      "comment": null,
      "timestamp": 1234567890
    }
  ],
  "format": "pdf | html"
}
```

**Response:**
- For PDF format: Binary PDF file with appropriate headers
- For HTML format:
```json
{
  "html": "string",
  "filename": "string"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Export failed

### POST /api/export/qa-pair

Export a single Q&A pair to PDF or HTML format.

**Request Body:**
```json
{
  "qaPair": {
    "question": {
      "id": "string",
      "role": "user",
      "content": "string",
      "timestamp": 1234567890
    },
    "answer": {
      "id": "string",
      "role": "assistant",
      "content": "string",
      "timestamp": 1234567890
    },
    "rating": null,
    "comment": null
  },
  "conversationId": "conv-123",
  "format": "pdf | html"
}
```

**Response:**
- For PDF format: Binary PDF file with appropriate headers
- For HTML format:
```json
{
  "html": "string",
  "filename": "string"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Export failed

---

## Assets Routes

Base path: `/api/assets`

The assets API provides access to configuration files and text-based resources stored in a dedicated GitHub repository.

### GET /api/assets/:key

Retrieves the content of a specific asset from the GitHub configuration repository.

**Parameters:**
- `key` (path parameter): The full path to the file in the repository (e.g., `config/production/api-settings.json`)

**Response:**
- Content-Type is automatically set based on file extension
- Returns the raw content of the file

**Example:**
```bash
curl -X GET http://localhost:3001/api/assets/config/production/api-settings.json
```

**Status Codes:**
- `200 OK`: Asset retrieved successfully
- `400 Bad Request`: Asset key is missing
- `401 Unauthorized`: GitHub authentication failed
- `404 Not Found`: Asset not found
- `429 Too Many Requests`: GitHub API rate limit exceeded
- `500 Internal Server Error`: Server error

### GET /api/assets

Lists available assets in a directory.

**Query Parameters:**
- `path` (optional): Directory path to list (defaults to repository root)

**Response:**
```json
[
  "config/production/api-settings.json",
  "config/staging/api-settings.json",
  "templates/email-template.html"
]
```

**Example:**
```bash
curl -X GET http://localhost:3001/api/assets?path=config
```

### GET /api/assets/:key/metadata

Retrieves an asset with its metadata including SHA, size, and last modified date.

**Parameters:**
- `key` (path parameter): The full path to the file in the repository

**Response:**
```json
{
  "content": "file content here...",
  "sha": "abc123...",
  "size": 1234,
  "encoding": "base64",
  "lastModified": "2025-01-09T10:30:00Z"
}
```

### POST /api/assets/cache/clear

Clears the asset cache for improved performance.

**Request Body (optional):**
```json
{
  "key": "config/production/api-settings.json"
}
```

If no key is provided, the entire cache is cleared.

**Response:**
```json
{
  "message": "Cache cleared for key: config/production/api-settings.json"
}
```

**Environment Variables:**
- `GITHUB_CONFIG_REPO`: Repository containing configuration files (format: owner/repo)
- `GITHUB_CONFIG_TOKEN`: GitHub personal access token with read access
- `GITHUB_CONFIG_BRANCH`: Branch to read from (default: main)

---

## GitHub Routes

Base path: `/api/github`

**Note:** All GitHub endpoints require GitHub configuration via environment variables:
- `GITHUB_REPO`: Repository in format `owner/repo`
- `GITHUB_TOKEN`: Optional personal access token (required for private repos, increases rate limit)

### GET /api/github/status

Check GitHub connection status and rate limit information.

**Response:**
```json
{
  "success": true,
  "repository": "owner/repo",
  "rateLimit": {
    "limit": 5000,
    "remaining": 4999,
    "reset": "2025-01-09T11:00:00Z"
  }
}
```

**Error Response:**
- `503 Service Unavailable`: GitHub not configured

### GET /api/github/repository

Get repository information.

**Response:**
```json
{
  "id": 123456789,
  "name": "repo-name",
  "full_name": "owner/repo-name",
  "description": "Repository description",
  "private": false,
  "stargazers_count": 42,
  "language": "TypeScript",
  "default_branch": "main"
}
```

### GET /api/github/files

List files in a directory.

**Query Parameters:**
- `path` (optional): Directory path (defaults to root)

**Response:**
```json
[
  {
    "name": "file.txt",
    "path": "path/to/file.txt",
    "type": "file | dir",
    "size": 1234,
    "download_url": "https://raw.githubusercontent.com/..."
  }
]
```

### GET /api/github/tree

Get repository file tree.

**Query Parameters:**
- `recursive` (optional, default: true): Fetch tree recursively

**Response:**
```json
{
  "sha": "abc123...",
  "tree": [
    {
      "path": "path/to/file.txt",
      "type": "blob | tree",
      "size": 1234
    }
  ]
}
```

### GET /api/github/file/{path}

Get file content.

**Path Parameters:**
- `path`: File path within the repository

**Query Parameters:**
- `format` (optional, default: "raw"): Response format ("raw" | "base64")

**Response:**
- For `format=raw`: Plain text file content
- For `format=base64`:
```json
{
  "content": "base64-encoded-content",
  "encoding": "base64",
  "sha": "file-sha"
}
```

**Error Responses:**
- `400 Bad Request`: File path is required
- `500 Internal Server Error`: Failed to get file content

### GET /api/github/search

Search for files in repository.

**Query Parameters:**
- `q` (required): Search query
- `path` (optional): Limit search to specific path
- `extension` (optional): Filter by file extension
- `limit` (optional, default: 30): Maximum results

**Response:**
```json
[
  {
    "name": "file.txt",
    "path": "path/to/file.txt",
    "html_url": "https://github.com/owner/repo/blob/main/path/to/file.txt"
  }
]
```

**Error Response:**
- `400 Bad Request`: Search query is required

### GET /api/github/files-by-extension/{extension}

List all files with specific extension.

**Path Parameters:**
- `extension`: File extension (without dot)

**Response:**
```json
[
  "path/to/file1.js",
  "path/to/file2.js"
]
```

### GET /api/github/rate-limit

Get GitHub API rate limit status.

**Response:**
```json
{
  "resources": { /* detailed rate limit info */ },
  "rate": {
    "limit": 5000,
    "remaining": 4999,
    "reset": 1704792000,
    "used": 1
  }
}
```

---

## LLM Routes

Base path: `/api/llm`

### POST /api/llm/execute-prompt

Execute a prompt from GitHub against a conversation using an LLM.

**Request Body:**
```json
{
  "llmConfiguration": "gpt-4",
  "promptFilePath": "prompts/analysis/conversation-summary.md",
  "conversation": {
    "id": "string",
    "title": "string",
    "createdAt": "2025-01-08T10:30:00Z",
    "messages": [
      {
        "role": "user | assistant",
        "content": "string",
        "timestamp": "2025-01-08T10:30:00Z"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt execution request accepted",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid conversation structure
- `500 Internal Server Error`: Execution failed

**Note:** This endpoint currently returns an acknowledgment. The actual LLM execution is planned for future implementation.

### GET /api/llm/status/{requestId}

Get the status of a prompt execution request.

**Path Parameters:**
- `requestId`: The request ID returned from execute-prompt

**Response:**
```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending | processing | completed | failed",
  "result": "string (when completed)",
  "error": "string (when failed)",
  "createdAt": "2025-01-08T10:30:00Z",
  "updatedAt": "2025-01-08T10:30:00Z"
}
```

**Note:** Status tracking is not yet implemented. Currently returns mock data.

### GET /api/llm/configurations

Get all available LLM configurations.

**Response:**
```json
{
  "configurations": [
    {
      "name": "gpt-3.5-turbo",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "description": "OpenAI GPT-3.5 Turbo",
      "enabled": true
    }
  ],
  "defaultConfiguration": "gpt-3.5-turbo"
}
```

**Supported Providers:**
- `openai`
- `anthropic`
- `google`
- `azure-openai`
- `litellm`
- `ollama`

### POST /api/llm/test

Test an LLM configuration with a simple prompt.

**Request Body:**
```json
{
  "configurationName": "gpt-3.5-turbo",
  "prompt": "Tell me a short story about a robot" // optional
}
```

**Response:**
```json
{
  "success": true,
  "configuration": "gpt-3.5-turbo",
  "response": "LLM response text",
  "error": "string (if failed)",
  "duration": 1234 // milliseconds
}
```

**Error Responses:**
- `400 Bad Request`: Missing required field
- `404 Not Found`: Configuration not found
- `500 Internal Server Error`: Test failed

### POST /api/llm/reload

Reload LLM configurations from file.

**Response:**
```json
{
  "success": true,
  "message": "Configurations reloaded successfully",
  "configurationsLoaded": 5
}
```

**Error Response:**
- `500 Internal Server Error`: Failed to reload configurations

---

## Agent Routes

Base path: `/api/agent`

**Note:** Agent configurations are loaded from `agent-config.yaml` file which contains agent names, URLs, and database connection strings.

### GET /api/agent

Get all configured agents in the system.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "name": "Customer Facing",
      "url": "http://localhost:3001/api/agent1",
      "database_connection_string": "postgresql://user:password@localhost:5432/agent1_db"
    },
    {
      "name": "Ask Athena",
      "url": "http://localhost:3002/api/agent2",
      "database_connection_string": "postgresql://user:password@localhost:5432/agent2_db"
    }
  ],
  "count": 2
}
```

**Error Response:**
- `500 Internal Server Error`: Failed to retrieve agents

### GET /api/agent/{name}

Get a specific agent by name.

**Path Parameters:**
- `name`: The name of the agent to retrieve (e.g., "Customer Facing")

**Response:**
```json
{
  "success": true,
  "agent": {
    "name": "Customer Facing",
    "url": "http://localhost:3001/api/agent1",
    "database_connection_string": "postgresql://user:password@localhost:5432/agent1_db"
  }
}
```

**Error Responses:**
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Failed to retrieve agent

### POST /api/agent/reload

Reload agent configuration from the `agent-config.yaml` file.

**Response:**
```json
{
  "success": true,
  "message": "Agent configuration reloaded successfully",
  "agentsLoaded": 3
}
```

**Error Response:**
- `500 Internal Server Error`: Failed to reload agent configuration

### GET /api/agent/threads

Get paginated thread data from a specific agent's database with optional date filtering.

**Query Parameters:**
- `agentName` (required): Name of the agent whose threads to retrieve
- `page` (optional, default: 1): Page number (minimum: 1)
- `limit` (optional, default: 50): Number of items per page (range: 1-100)
- `fromDate` (optional): Filter threads created from this date (inclusive). ISO 8601 format.
- `toDate` (optional): Filter threads created until this date (inclusive). ISO 8601 format.

**Example Request:**
```
GET /api/agent/threads?agentName=Customer Facing&page=1&limit=20
GET /api/agent/threads?agentName=Customer Facing&fromDate=2025-01-01T00:00:00Z&toDate=2025-01-31T23:59:59Z
```

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "thread_id": "abc-123",
        "thread_ts": "2025-01-06T10:30:00Z",
        "channel_id": "channel-1",
        "configurable": {},
        "created_at": "2025-01-06T10:30:00Z",
        "updated_at": "2025-01-06T11:00:00Z",
        "metadata": {},
        "checkpoint": {},
        "parent_checkpoint": {}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing agent name or invalid pagination parameters
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Database connection error or query failed

**Database Requirements:**
- Requires direct database access using the PostgreSQL connection string from agent configuration
- The agent's database must have a `thread` table with the expected schema

### GET /api/agent/thread/{threadId}/documents

Get the retrieved documents for a specific thread.

**Path Parameters:**
- `threadId`: The thread ID to retrieve documents for (e.g., "thread_abc123")

**Query Parameters:**
- `agentName` (required): Name of the agent that owns the thread

**Example Request:**
```
GET /api/agent/thread/thread_abc123/documents?agentName=Customer Facing
```

**Response:**
```json
{
  "success": true,
  "threadId": "thread_abc123",
  "documents": [
    {
      // Document object structure varies based on agent implementation
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Missing thread ID or agent name
- `404 Not Found`: Thread or agent not found
- `500 Internal Server Error`: Database connection error or query failed

**Notes:**
- Documents are retrieved from the `values->'retrieved_docs'` field in the thread table
- The structure of documents depends on how the agent stores retrieved documents
- Returns an empty array if no documents are associated with the thread

### GET /api/agent/test-connection

Test database connection for a specific agent.

**Query Parameters:**
- `agentName` (required): Name of the agent to test

**Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "agent": "Customer Facing"
}
```

**Error Responses:**
- `400 Bad Request`: Missing agent name
- `404 Not Found`: Agent not found
- `500 Internal Server Error`: Connection test failed

---

## Asset API Routes

Base path: `/api/asset`

The Asset API provides secure access to configuration assets from either GitHub or database sources with prefix-based access control.

### Security

Access to assets is restricted based on the `API_ACCESSIBLE_ASSETS_PREFIX` environment variable. Only asset keys that start with the configured prefix are accessible through this API.

**Example:**
- If `API_ACCESSIBLE_ASSETS_PREFIX=public/`, only assets like `public/config.json`, `public/settings.yaml` are accessible
- Requests for `private/secrets.json` would be denied with a 403 error

### GET /api/asset/:asset_key

Retrieves an asset by its key from either GitHub or database sources.

**Parameters:**
- `asset_key` (path parameter): The asset key to retrieve. Must be URL-encoded if it contains special characters like `/`.
  - Example: `public/config.json` → `public%2Fconfig.json`
  - Example: `settings/app config.yaml` → `settings%2Fapp%20config.yaml`

**Query Parameters:**
- `source` (optional): Specify the source to retrieve from (`github` or `database`). Defaults to GitHub with automatic fallback to database.

**Response:**
```json
{
  "assetKey": "public/config.json",
  "source": "github",
  "content": {
    "key": "value"
  },
  "metadata": {
    "size": 1234,
    "contentType": "application/json",
    "lastModified": "2025-01-13T10:30:00Z"
  }
}
```

**Example:**
```bash
# Retrieve from any available source (URL-encoded path)
curl -X GET http://localhost:3001/api/asset/public%2Fconfig.json

# Retrieve specifically from database
curl -X GET http://localhost:3001/api/asset/public%2Fconfig.json?source=database

# Using curl with automatic URL encoding
curl -X GET --url-query "http://localhost:3001/api/asset/public/config.json"
```

**Status Codes:**
- `200 OK`: Asset retrieved successfully
- `403 Forbidden`: Asset key does not match allowed prefix
- `404 Not Found`: Asset not found in any source
- `500 Internal Server Error`: Server error

### GET /api/asset

Lists available assets from configured sources.

**Query Parameters:**
- `source` (optional): Filter by source (`github`, `database`, or `all`). Defaults to all.
- `prefix` (optional): Filter assets by key prefix

**Response:**
```json
{
  "assets": [
    {
      "key": "public/config.json",
      "source": "github",
      "type": "json",
      "size": 1234
    },
    {
      "key": "public/settings.yaml",
      "source": "database",
      "type": "yaml",
      "size": 567
    }
  ],
  "total": 2
}
```

**Note:** This endpoint currently returns a placeholder response. Full implementation requires list methods in GitHub and Database clients.

**Environment Variables:**
- `API_ACCESSIBLE_ASSETS_PREFIX`: Prefix that asset keys must start with to be accessible
  - Use normal (unencoded) format: `public/` not `public%2F`
  - The API handles URL encoding/decoding automatically
  - Example: Set to `public/` to allow only `public/config.json`, `public/settings.yaml`, etc.
- `GITHUB_REPO`: GitHub repository for assets (format: owner/repo)
- `GITHUB_TOKEN`: GitHub access token
- `GITHUB_BRANCH`: Branch to use (default: main)
- `DATABASE_URL`: Database connection string for asset storage

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error
- `503 Service Unavailable`: Service not configured or available

## Request Limits

- Maximum request body size: 10MB
- This applies to all POST requests

## Authentication

Currently, the API does not require authentication. Authentication mechanisms may be added in future versions.

## Environment Variables

Key environment variables for backend configuration:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `CORS_ORIGINS` or `CORS_ORIGIN`: Allowed CORS origins
- `GITHUB_REPO`: GitHub repository (format: owner/repo)
- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_CONFIG_REPO`: Configuration repository (format: owner/repo)
- `GITHUB_CONFIG_TOKEN`: Configuration repository access token
- `GITHUB_CONFIG_BRANCH`: Configuration repository branch (default: main)
- `OPENAI_API_KEY`: OpenAI API key for LLM
- `ANTHROPIC_API_KEY`: Anthropic API key for LLM
- `GOOGLE_API_KEY`: Google API key for LLM
- `ENV_SETTINGS_ASSET_KEY`: Path to environment settings file in GitHub configuration repository (default: `settings/env-settings`)
- `OVERRIDE_ENV_VARS`: If 'true', allows environment settings to override existing variables (default: false)

### Environment Settings Loading

The backend supports loading additional environment variables from a plain text file stored in the GitHub configuration repository. This allows for:

1. **Centralized Configuration**: Store environment-specific settings in your configuration repository
2. **Dynamic Updates**: Reload settings without restarting the application
3. **Fallback Support**: Application continues to work if settings file is not available

#### File Format:
The environment settings file should be a plain text file with KEY=VALUE pairs (one per line):
```
DATABASE_VERBOSE=false
CORS_ORIGINS=http://localhost:5173,http://localhost:5176
GITHUB_REPO=owner/repository-name
API_KEY=your-api-key
```

Empty lines and lines starting with `#` are ignored.

#### Setup:
1. Create a plain text file with your environment settings (see `env-settings.example`)
2. Upload it to your GitHub configuration repository
3. Set `ENV_SETTINGS_ASSET_KEY` to the path of the file (default: `settings/env-settings`)
4. Settings are loaded automatically on application startup

#### API Endpoints:
- `GET /api/debug/env`: View current environment configuration (development only)
- `POST /api/debug/env/reload`: Reload environment settings from repository (development only)

## Development

To run the backend server:

```bash
cd backend
npm install
npm run dev  # Development with hot reload
npm start    # Production mode
```

## Testing

API endpoints can be tested using:
1. Swagger UI at `/api-docs`
2. cURL commands
3. Postman or similar API testing tools

Example cURL command:
```bash
curl -X GET http://localhost:3001/health
```