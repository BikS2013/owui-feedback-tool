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

### Environment-Based Configuration Pattern
The application implements a sophisticated environment-based configuration pattern that supports both build-time and runtime configuration:

#### Configuration Sources (Priority Order)
1. **Runtime Configuration** (`/public/config.json`)
   - Loaded at application startup
   - Can be modified without rebuilding the application
   - Ideal for Docker deployments and environment-specific settings
   
2. **Build-time Configuration** (`.env` file)
   - Environment variables prefixed with `VITE_`
   - Compiled into the application at build time
   - Used as fallback when runtime config is not available
   
3. **Default Configuration**
   - Environment-specific defaults (development/staging/production)
   - Used when neither runtime nor build-time configs are available

#### Environment Variables (Build-time)
Configuration can be managed through environment variables in the `.env` file:

##### Client Port
- `VITE_CLIENT_PORT`: The port for the Vite development server (default: 5173)
- This is used when running `npm run dev`
- If the port is already in use, the server will exit with an error

##### API Endpoint
- `VITE_API_URL`: The backend API endpoint
- Must include the complete path (e.g., `http://localhost:3001/api`)
- Can be overridden by runtime configuration

##### GitHub Integration
- `VITE_GITHUB_REPO`: GitHub repository in format `owner/repo`
- `VITE_GITHUB_TOKEN`: Optional GitHub personal access token
  - Required for private repositories
  - Increases API rate limit from 60 to 5,000 requests/hour
  - Create at: https://github.com/settings/tokens
- `VITE_GITHUB_DATA_FOLDER`: Data folder path (default: 'data')
- `VITE_GITHUB_PROMPTS_FOLDER`: Prompts folder path (default: 'prompts')
- `VITE_GITHUB_API_URL`: GitHub API base URL (default: 'https://api.github.com')

#### Runtime Configuration (`config.json`)
The application loads configuration from `/public/config.json` at startup. This file contains comprehensive environment-specific settings:

```json
{
  "environment": "development",
  "version": "1.0.0",
  "features": {
    "analytics": { "enabled": false, "providers": [], "debugMode": true },
    "darkMode": { "enabled": true, "default": "auto" },
    "betaFeatures": { "enabled": true, "allowedUsers": [] },
    "debugging": { "enabled": true, "logLevel": "debug", "consoleOutput": true }
  },
  "ui": {
    "displayMode": { "default": "magic", "allowedModes": ["magic", "engineering"] }
  },
  "api": {
    "baseUrl": "http://localhost:3001",
    "endpoints": { /* endpoint mappings */ }
  },
  "github": {
    "repo": "owner/repository",
    "dataFolder": "data",
    "promptsFolder": "prompts"
  }
}
```

#### Configuration Service
The `EnvironmentConfigurationService` manages all configuration loading and provides:
- Automatic environment detection (development/staging/production)
- Configuration source tracking (runtime/buildtime/default)
- Type-safe access to all configuration values
- Fallback to appropriate defaults

## Data Sources Terminology

The application handles three distinct data sources:

1. **LangGraph chats** - Conversations retrieved through API integration with LangGraph
2. **Unrated OWUI chats** - Conversations loaded from file that do not contain rating data
3. **Rated OWUI chats** - Conversations loaded from file that include rating data

These standardized terms should be used consistently throughout the codebase and documentation to ensure clear communication about data sources.

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

### Configuration Management Specification
- The document "configuration-repo.md" contains registered details regarding the configuration management of the app. Any decision made regarding this topic must be registered there and any information needed regarding the topic must be retrieved from this file.

## Backend Module Guidelines
- There is a backend module which is hosted in the backend folder. 
- Always maintain a clear separation between the frontend and the backend
- Keep all code related to the backend in the backend folder
- Always look in the backend folder for any task or request considering the backend module