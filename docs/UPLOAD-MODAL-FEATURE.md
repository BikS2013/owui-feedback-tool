# Upload Modal Feature

## Overview

The upload data button now opens a modal dialog with two options for loading data:

1. **File Upload** - Upload a JSON file (existing functionality)
2. **Agent Threads** - Connect to an agent's database and load threads directly

## Features

### Upload Modal
- Two-tab interface for selecting data source
- File upload maintains existing functionality
- Agent threads tab shows available agents from the API

### Agent Thread Loading
- Fetches list of agents from the backend API
- Allows selection of specific agent
- Loads up to 100 threads from the selected agent's database
- Threads exclude `retrieved_docs` by default for performance

### Thread Detail View
- New component specifically for displaying agent threads
- Shows thread ID and timestamps in header
- Displays messages in a conversation format
- Distinguishes between human and assistant messages
- Supports markdown rendering for assistant responses
- Download functionality for threads (JSON, Markdown, Word, PDF)
- Raw JSON view toggle

## Implementation Details

### Components
- `UploadModal` - Main modal component with tabs
- `ThreadDetail` - Specialized view for agent thread conversations
- Updated `DataControls` to trigger modal instead of file input

### Store Updates
- Added `loadFromAgentThreads` method to feedback store
- Added `dataSource` state to track whether data came from file or agent
- Converts agent thread format to app's conversation format

### Backend Integration
- Uses existing `/api/agent` endpoint to fetch agents
- Uses `/api/agent/threads` endpoint to fetch thread data
- Automatically excludes `retrieved_docs` from thread values

## Usage

1. Click the upload button in the header
2. Select "Agent Threads" tab
3. Choose an agent from the dropdown
4. Click "Load Threads" button
5. Browse threads in the left panel
6. View thread details in the right panel