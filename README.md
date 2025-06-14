# OWUI Feedback

A React-based web application for exploring and analyzing user feedback data from an AI assistant system.

## Features

- **Conversation Browser**: View all conversations with ratings and timestamps
- **Detailed View**: Explore individual Q&A exchanges within conversations
- **Search**: Find conversations by content
- **Date Filtering**: Filter conversations by date range
- **Rating Filtering**: Filter by ratings at both conversation and Q&A level
- **Dark Theme**: Modern UI matching the provided design

## Getting Started

### Prerequisites

- Node.js 16+ and npm installed

### Installation

1. Navigate to the project directory:
```bash
cd owui-feedback
```

2. Install dependencies:
```bash
npm install
```

3. Configure the application:
```bash
cp .env.example .env
```
Then edit `.env` to configure:
```
# Port for the client application (default: 5173)
VITE_CLIENT_PORT=5173

# Backend API URL
VITE_API_URL=http://localhost:3001/api

# GitHub Integration (optional)
VITE_GITHUB_REPO=owner/repository
VITE_GITHUB_TOKEN=your_github_token_here
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to the provided URL (default: http://localhost:5173, or the port configured in VITE_CLIENT_PORT)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Browse Conversations**: The left sidebar shows all conversations. Click on any conversation to view its details.

2. **Search**: Use the search bar to find conversations containing specific text.

3. **Filter by Date**: Click the filter button to open the filter panel and set date ranges.

4. **Filter by Rating**: 
   - Choose between conversation-level or Q&A-level filtering
   - Set minimum and maximum rating thresholds
   - Toggle inclusion of unrated items

5. **View Details**: The main panel shows the full conversation with:
   - User questions and AI responses
   - Individual ratings for each response
   - User feedback comments
   - Timestamps for each message

## Data Sources

The application handles three distinct data sources:

1. **LangGraph chats** - Conversations retrieved through API integration with LangGraph
2. **Unrated OWUI chats** - Conversations loaded from file that do not contain rating data
3. **Rated OWUI chats** - Conversations loaded from file that include rating data

These standardized terms are used throughout the codebase and documentation to ensure clear communication about data sources.

## Data Format

The application loads data from `public/feedback-history-export.json`. The data structure includes:
- Conversation metadata
- User questions and AI assistant responses
- Ratings (1-10 scale)
- User feedback comments
- Timestamps

## GitHub Integration

The application includes a GitHub API service for retrieving repository files:

### Configuration
1. Set `VITE_GITHUB_REPO` to your repository (format: `owner/repo`)
2. Set `VITE_GITHUB_TOKEN` for private repos or to increase API rate limits
   - Create a token at: https://github.com/settings/tokens
   - Required scopes: `repo` (private) or `public_repo` (public)

### Available Methods
```typescript
import { GitHubService } from './services/github.service';

// Get files in a directory
const files = await GitHubService.getFiles('src/components');

// Get all files recursively
const tree = await GitHubService.getTree();

// Get file content
const content = await GitHubService.getFileContentAsText('README.md');

// Search for files
const results = await GitHubService.searchFiles('test', { extension: 'ts' });

// Get files by extension
const tsFiles = await GitHubService.getFilesByExtension('ts');
```

### Rate Limits
- Without token: 60 requests/hour
- With token: 5,000 requests/hour
- Check current limits: `GitHubService.getRateLimit()`

## Technical Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **date-fns** for date handling
- **react-markdown** for rendering markdown content
- **Lucide React** for icons

## Project Structure

```
src/
├── components/         # React components
│   ├── ConversationList/
│   ├── ConversationDetail/
│   └── FilterPanel/
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── store/             # Data management
└── App.tsx            # Main application component
```
