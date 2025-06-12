# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# First time setup
cp .env.example .env  # Configure API endpoint

npm run dev        # Start development server with hot reload (port from VITE_CLIENT_PORT or 5173)
npm run build      # Run TypeScript checks and build for production
npm run preview    # Preview production build locally
npm run lint       # Run ESLint to check code quality
```

### Docker
```bash
# Docker CLI
npm run docker:build    # Build Docker image
npm run docker:run      # Run container on port 8080
npm run docker:stop     # Stop and remove container

# Docker Compose
npm run docker:compose:up     # Start services
npm run docker:compose:down   # Stop services
npm run docker:compose:build  # Rebuild images
```

## Configuration

### Environment Variables
Configuration is managed through environment variables in the `.env` file:

#### Client Port
- `VITE_CLIENT_PORT`: The port for the Vite development server (default: 5173)
- This is used when running `npm run dev`
- If the port is already in use, the server will exit with an error

#### API Endpoint
- `VITE_API_URL`: The backend API endpoint
- Must include the complete path (e.g., `http://localhost:3001/api`)
- This value is read at build time and cannot be changed at runtime
- The Settings modal shows the current configuration and allows testing the connection

#### GitHub Integration
- `VITE_GITHUB_REPO`: GitHub repository in format `owner/repo`
- `VITE_GITHUB_TOKEN`: Optional GitHub personal access token
  - Required for private repositories
  - Increases API rate limit from 60 to 5,000 requests/hour
  - Create at: https://github.com/settings/tokens

## Architecture Overview

This is a React-based SPA for exploring AI assistant feedback data. Key architectural decisions:

### State Management
- Uses React Context API (no Redux/MobX)
- Two main stores:
  - `feedbackStore.tsx`: Manages feedback data, filtering, and search
  - `themeStore.tsx`: Handles dark/light theme toggling

### Data Flow
1. Static JSON data loaded from `public/feedback-history-export.json`
2. Processed through `utils/dataProcessor.ts` for filtering and search
3. Fuse.js provides fuzzy search across conversation content
4. Components consume data via Context hooks

### Component Organization
Components are feature-based in separate directories with their CSS:
- `ConversationList/`: Left panel showing all conversations
- `ConversationDetail/`: Right panel displaying selected conversation
- `FilterPanel/`: Search and filter controls
- `ResizablePanel/`: Wrapper for draggable panel resizing
- `DataControls/`: Export and action buttons

### TypeScript Configuration
- Strict mode enabled
- Separate configs for app and node environments
- React JSX transform (no need to import React)

## Important Notes

### No Testing Framework
Currently no testing infrastructure. If tests are needed, consider adding Vitest for Vite compatibility.

### Known Issues
Check `Issues - Pending Items.md` for current problems. Critical issue: download functionality not working.

### Styling Approach
- CSS modules not used - plain CSS files per component
- CSS variables for theming (see `index.css` for theme variables)
- Responsive design with resizable panels

### Build Output
Production builds go to `dist/` directory. Docker image serves via nginx on port 80 (mapped to 8080).

## Documentation Guidelines

### Analytics Specification
- The file "Analytics Requirements & Specs.md" must serve as the "source of truth" regarding the design and the specs of the overall analytics offered by the app. Every new design decision regarding this topic must be registered there. All questions related to the functionality or the technical design in this area must be retrieved from this file.

### LLM Integration Specification
- The file "LLM-INTEGRATION.md" located in the backend folder, must be used as the "source of truth" regarding the llm integration to the app. Every new design decision regarding this topic must be registered there. All questions related to the functionality or the technical design in this area must be retrieved from this file.

### Backend API Specification
- The file "BACKEND-API.md" located in the backend folder, must be used as the "source of truth" regarding the APIs developed to support or enhance the app. Every new design decision regarding the server side APIs must be registered there. All questions related to the functionality or the technical design of the server side APIs must be retrieved from this file.

### Agent Integration Specification
- The file "AGENT-INTEGRATION.md" located in the backend folder, must be used as the "source of truth" regarding the agent integration to the app including the agent database access, the agent data used by the backend, etc. Every new design decision regarding this topic must be registered there. All questions related to the functionality or the technical design in this area must be retrieved from this file.

## Backend Module Guidelines
- There is a backend module which is hosted in the backend folder. 
- Always maintain a clear separation between the frontend and the backend
- Keep all code related to the backend in the backend folder
- Always look in the backend folder for any task or request considering the backend module