# Agent API Test Scripts

This directory contains test scripts for the Agent API endpoints.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure the backend server is running on port 3001:
   ```bash
   cd ../backend
   npm run dev
   ```

3. Run the test:
   ```bash
   npm test
   # or
   node agent-api-test.js
   ```

## Files

- `agent-api-test.js` - Main test script that retrieves agents, threads, and documents
- `AGENT-API-TEST-FLOW.md` - Detailed documentation of the API test flow
- `package.json` - Node.js dependencies

## Test Flow

1. Retrieves all configured agents from the server
2. For the first agent, retrieves the last 20 chats (threads)
3. For the first chat, retrieves the documents used in that chat

See `AGENT-API-TEST-FLOW.md` for complete documentation.