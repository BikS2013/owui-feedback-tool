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
- `OPENAI_API_KEY`: OpenAI API key for LLM
- `ANTHROPIC_API_KEY`: Anthropic API key for LLM
- `GOOGLE_API_KEY`: Google API key for LLM

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