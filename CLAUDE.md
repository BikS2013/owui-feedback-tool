# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev        # Start development server with hot reload (http://localhost:5173)
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
- The file "Analytics Requirements & Specs.md" must serve as the "source of truth" regarding the design and the specs of the overall analytics offered by the app. 
- Every new design decision regarding this topic must be registered there.
- All questions related to the functionality or the technical design in this area must be retrieved from this file.