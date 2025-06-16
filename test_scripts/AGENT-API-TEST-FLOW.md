# Agent API Test Flow Documentation

This document describes the complete test flow for retrieving agent data from the backend API server running on port 3001.

## Test Overview

The test performs the following sequence of operations:
1. Retrieve all configured agents from the server
2. For the first agent, retrieve the last 20 chats (threads)
3. For the first chat, retrieve the documents used in that chat

## Prerequisites

- Backend server running on `http://localhost:3001`
- Node.js installed with axios package (`npm install axios`)
- At least one agent configured in the backend's `agent-config.yaml`
- Agent database must be accessible and contain thread data

## API Endpoints Used

### 1. GET /api/agent
### 2. GET /api/agent/threads
### 3. GET /api/agent/thread/{threadId}/documents

## Detailed Test Flow

### Step 1: Retrieve All Configured Agents

**Request:**
```http
GET http://localhost:3001/api/agent
```

**Expected Response:**
```json
{
  "success": true,
  "agents": [
    {
      "name": "Customer Facing",
      "url": "http://localhost:3001/api/agent1",
      "database_connection_string": "postgresql://u***e:********@localhost:5432/agent1_db"
    },
    {
      "name": "Ask Athena",
      "url": "http://localhost:3002/api/agent2",
      "database_connection_string": "postgresql://u***e:********@localhost:5432/agent2_db"
    }
  ],
  "count": 2
}
```

**Notes:**
- Database connection strings are masked for security (username/password are partially hidden)
- The response includes all agents configured in `agent-config.yaml`
- We select the first agent from the array for subsequent operations

### Step 2: Retrieve Last 20 Threads for First Agent

**Request:**
```http
GET http://localhost:3001/api/agent/threads?agentName=Customer Facing&page=1&limit=20
```

**Query Parameters:**
- `agentName`: Name of the agent (from Step 1)
- `page`: Page number (1 for first page)
- `limit`: Number of threads to retrieve (20)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "thread_id": "thread_abc123",
        "thread_ts": "2025-01-06T10:30:00Z",
        "channel_id": "channel-1",
        "configurable": {},
        "created_at": "2025-01-06T10:30:00Z",
        "updated_at": "2025-01-06T11:00:00Z",
        "metadata": {},
        "checkpoint": {},
        "parent_checkpoint": {}
      },
      // ... 19 more threads
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

**Notes:**
- Threads are retrieved directly from the agent's PostgreSQL database
- Results are paginated with metadata about total threads available
- Threads are ordered by creation date (most recent first)
- We select the first thread for document retrieval

### Step 3: Retrieve Documents for First Thread

**Request:**
```http
GET http://localhost:3001/api/agent/thread/thread_abc123/documents?agentName=Customer Facing
```

**Path Parameters:**
- `threadId`: The thread ID from Step 2 (e.g., "thread_abc123")

**Query Parameters:**
- `agentName`: Name of the agent that owns the thread

**Expected Response:**
```json
{
  "success": true,
  "threadId": "thread_abc123",
  "documents": [
    {
      // Document structure varies based on agent implementation
      // Typically includes:
      "id": "doc_123",
      "title": "Document Title",
      "content": "Document content...",
      "metadata": {
        "source": "knowledge_base",
        "relevance_score": 0.85
      }
    },
    // ... more documents
  ]
}
```

**Notes:**
- Documents are retrieved from the `values->'retrieved_docs'` JSONB field in the thread table
- The document structure depends on how each agent stores retrieved documents
- Returns an empty array if no documents were used in the thread

## Running the Test

### Option 1: Using the provided test script

```bash
cd test_scripts
npm install axios  # If not already installed
node agent-api-test.js
```

### Option 2: Manual testing with cURL

```bash
# Step 1: Get all agents
curl -X GET http://localhost:3001/api/agent

# Step 2: Get threads (replace AGENT_NAME with actual agent name)
curl -X GET "http://localhost:3001/api/agent/threads?agentName=AGENT_NAME&page=1&limit=20"

# Step 3: Get documents (replace THREAD_ID and AGENT_NAME)
curl -X GET "http://localhost:3001/api/agent/thread/THREAD_ID/documents?agentName=AGENT_NAME"
```

## Error Handling

The test handles various error scenarios:

### No Agents Configured
```json
{
  "success": true,
  "agents": [],
  "count": 0
}
```
Test will exit with message: "No agents found. Exiting test."

### Agent Not Found
```json
{
  "error": "Not Found",
  "message": "Agent 'NonExistent' not found"
}
```
HTTP Status: 404

### Database Connection Error
```json
{
  "error": "Database Error",
  "message": "Failed to connect to agent database: connection timeout"
}
```
HTTP Status: 500

### No Threads Found
```json
{
  "success": true,
  "data": {
    "threads": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```
Test will exit with message: "No threads found for agent. Exiting test."

## Performance Considerations

- Thread queries use database pagination to handle large datasets efficiently
- Consider implementing caching for frequently accessed agent configurations
- Database connection pooling is recommended for production use
- Index the `created_at` column in the thread table for better query performance

## Security Notes

- Database connection strings in responses are masked to hide credentials
- Ensure agent databases use SSL/TLS connections in production
- Implement proper authentication for API endpoints before production deployment
- Consider rate limiting for database-intensive operations

## Test Output Example

```
================================================================================
AGENT API TEST FLOW
================================================================================
API Base URL: http://localhost:3001/api
Start Time: 2025-01-16T10:30:00.123Z


STEP 1: RETRIEVE ALL CONFIGURED AGENTS
--------------------------------------------------------------------------------
REQUEST: GET http://localhost:3001/api/agent

RESPONSE STATUS: 200
RESPONSE HEADERS: {
  "content-type": "application/json; charset=utf-8",
  "content-length": "456"
}

RESPONSE BODY:
{
  "success": true,
  "agents": [...],
  "count": 2
}

Selected first agent: "Customer Facing"


STEP 2: RETRIEVE LAST 20 THREADS FOR FIRST AGENT
--------------------------------------------------------------------------------
REQUEST: GET http://localhost:3001/api/agent/threads
QUERY PARAMS: { agentName: 'Customer Facing', page: 1, limit: 20 }

RESPONSE STATUS: 200
...

Selected first thread: "thread_abc123"
Thread created at: 2025-01-06T10:30:00Z


STEP 3: RETRIEVE DOCUMENTS FOR FIRST THREAD
--------------------------------------------------------------------------------
REQUEST: GET http://localhost:3001/api/agent/thread/thread_abc123/documents
QUERY PARAMS: { agentName: 'Customer Facing' }

RESPONSE STATUS: 200
...

Found 3 documents for thread


TEST SUMMARY
================================================================================
✓ Retrieved 2 agents
✓ Retrieved 20 threads for agent "Customer Facing"
✓ Retrieved 3 documents for thread "thread_abc123"

End Time: 2025-01-16T10:30:02.456Z
```

## Next Steps

1. Extend the test to cover error scenarios
2. Add performance benchmarking
3. Create automated test suite with assertions
4. Add support for filtering threads by date range
5. Implement webhook notifications for new threads