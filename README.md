# Athena Feedback Explorer

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
cd athena-feedback-explorer
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to the provided URL (usually http://localhost:5173)

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

## Data Format

The application loads data from `public/feedback-history-export.json`. The data structure includes:
- Conversation metadata
- User questions and AI assistant responses
- Ratings (1-10 scale)
- User feedback comments
- Timestamps

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
