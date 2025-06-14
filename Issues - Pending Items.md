# Issues - Pending Items

## Completed Items (Most Recent First)

### Static Filters Tab Implementation (Completed: 2025-01-14)
**Requirements**: Add a tab with static filters (date, model, rating) completely decoupled from Natural Language filters
**Solution**:
1. Added Tab System to FilterPanel:
   - Two tabs: "Static Filters" and "Natural Language"
   - Each tab operates independently
   - Visual indicators show when filters are active

2. Static Filters Implemented:
   - **Date Range Filter**: From/To date inputs for conversation filtering
   - **Model Filter**: Checkbox list of all models found in conversations
   - **Rating Filter**: Min/Max rating sliders with "Include unrated" option

3. Technical Implementation:
   - Extended FilterOptions type to include static filter fields
   - Created `staticFilters.ts` utility for applying filters
   - Updated App.tsx to apply both filter types in sequence
   - Filters are completely decoupled - can use either or both

4. UI/UX Enhancements:
   - Tab indicators show active filters
   - Filter button tooltip shows all active filters
   - Clear separation between filter types
   - Apply/Clear buttons for static filters

**Benefits:**
- Users can combine static and natural language filters
- Static filters provide precise control
- Natural language filters handle complex queries
- Clear visual feedback about active filters

### 1. **Backend API Swagger Documentation Review (Completed: 2025-01-14)**
**Requirements**: Examine all API endpoints and verify their Swagger documentation is correct and complete.

**Findings**:

#### Agent Routes (/api/agent)
✅ All endpoints have complete Swagger documentation:
- GET `/` - Get all configured agents
- GET `/threads` - Get threads from agent's database (with pagination and filters)
- GET `/thread/:threadId/documents` - Get documents for a specific thread
- POST `/reload` - Reload agent configuration
- GET `/test-connection` - Test database connection for an agent
- GET `/:name` - Get a specific agent by name

#### Export Routes (/api/export)
✅ All endpoints have complete Swagger documentation:
- POST `/conversation` - Export conversation to PDF or HTML
- POST `/qa-pair` - Export single Q&A pair to PDF or HTML

#### GitHub Routes (/api/github)
✅ All endpoints have complete Swagger documentation:
- GET `/status` - Check GitHub connection status
- GET `/repository` - Get repository information
- GET `/files` - List files in a directory
- GET `/tree` - Get repository file tree
- GET `/file/*` - Get file content
- GET `/search` - Search for files in repository
- GET `/files-by-extension/:extension` - List files by extension
- GET `/rate-limit` - Get GitHub API rate limit status

#### LLM Routes (/api/llm)
✅ All endpoints have complete Swagger documentation:
- POST `/execute-prompt` - Execute prompt from GitHub against conversation
- GET `/status/:requestId` - Get prompt execution status
- GET `/configurations` - Get all available LLM configurations
- POST `/test` - Test LLM configuration with simple prompt
- POST `/reload` - Reload LLM configurations from file
- POST `/execute-prompt-direct` - Execute prompt directly with parameter values
- POST `/convert-to-filter` - Convert natural language query to filter expression

#### Main App Route
✅ Health check endpoint documented:
- GET `/health` - Health check endpoint

**Documentation Quality Assessment**:
1. **Consistent Structure**: All endpoints follow consistent documentation patterns
2. **Complete Request/Response Schemas**: All request bodies and responses have detailed schemas
3. **Parameter Documentation**: Query, path, and body parameters are well documented
4. **Error Responses**: All endpoints document various error conditions (400, 404, 500)
5. **Examples**: Many schemas include example values
6. **Tags**: All routes are properly tagged for organization

**Minor Issues Found**:
1. Swagger config tags don't include "Agents" tag (only has Export, Health, GitHub, LLM)
2. Some endpoints return void but still send responses (TypeScript typing issue, not Swagger)

**Overall**: The Swagger documentation is comprehensive and well-maintained. All endpoints have proper documentation with detailed schemas, examples, and error handling.

### 2. **Natural Language Query Filter with Sample Data (Completed: 2025-01-14)**
**Requirements**: Send selected chat as sample data when invoking natural language filter API
**Solution**:
1. Backend Updates:
   - Modified `/llm/convert-to-filter` endpoint to accept `sampleData` parameter
   - Updated prompt generation to include sample data when provided
   - Added support for both JSON and JavaScript code responses
   - Emphasized in prompt that complete dataset is array of similar objects

2. Frontend Updates:
   - Added `currentThread` prop to FilterPanel component
   - Modified ConversationList to pass current LangGraph thread to FilterPanel
   - Updated executeNaturalLanguageQuery to include sample data in request
   - Added response handling for JavaScript code generation
   - Updated applyGeneratedFilter to detect JavaScript code (temporary message)

3. Implementation Details:
   - When sample data is provided, backend uses actual data structure for more accurate filtering
   - Prompt includes the sample with explanation that full dataset is array of similar objects
   - Backend can generate either JSON filters or JavaScript code based on query complexity
   - Frontend shows appropriate error message for JavaScript code (future feature)

**Benefits:**
- LLM can see actual data structure for more accurate filter generation
- Better handling of complex queries that require custom logic
- Foundation for future client-side JavaScript execution of filters

### 3. **JavaScript Filtering for LangGraph Data (Completed: 2025-01-14)**
**Requirements**: Implement JavaScript filtering option on the client for LangGraph data
**Solution**:
1. Frontend Implementation:
   - Created `javascriptFilter.ts` utility with `applyJavaScriptFilter` function
   - Added validation to prevent dangerous code patterns (eval, fetch, DOM manipulation)
   - Sandboxed execution using Function constructor
   - Updated App component to detect and apply JavaScript filters for LangGraph data
   
2. Filter Application Flow:
   - When JavaScript filter is active and viewing LangGraph data:
     - Apply filter to raw threads first
     - Convert only filtered threads to conversations
   - Standard filters continue to work for non-JavaScript filtering
   
3. UI/UX Enhancements:
   - Filter button shows active state with indicator dot
   - Natural Language tab displays "Active" badge
   - Tooltips show the active natural language query
   - Different placeholder examples for LangGraph vs file-based data
   
4. Type System Updates:
   - Extended FilterOptions to include `customJavaScriptFilter` and `naturalLanguageQuery`
   - Created `langgraphConverter.ts` for thread-to-conversation conversion
   
**Implementation Details**:
- Backend already supported JavaScript code generation when sample data provided
- Frontend sends current thread as sample data for accurate filter generation
- JavaScript filters execute client-side for performance
- Graceful fallback to all data if filter execution fails
- Clear visual feedback about active filters

**Documentation**:
- Created `docs/JAVASCRIPT-FILTERING.md` with examples and security notes
- Updated FilterPanel with context-aware placeholder examples

## Pending Items

### Prompt Execution with LangGraph Data Fixed (Completed: 2025-01-14)
**Issue**: Evaluation prompts weren't receiving the chat data displayed on screen for LangGraph threads
**Root Cause**: When in agent mode, the conversation object passed to prompts had empty messages array
**Solution**:
1. Modified `handleExecutePrompt` to build proper conversation data:
   - For LangGraph data: Creates conversation object with actual messages from currentThread
   - For OWUI data: Uses existing conversation object as-is
2. Updated PromptSelectorModal prop to include transformed messages for LangGraph
3. Added debug logging to track conversation data being passed to prompts

**Implementation**:
- Transforms LangGraph messages to standard format when building parameters
- Handles different content formats (string, text field, nested object)
- Preserves timestamps and model information
- Now prompts receive the complete chat history visible on screen

### LangGraph Data Preservation and Separate Chat Rendering (Completed: 2025-01-14)
**Requirements**: Keep LangGraph chat data intact and render them differently from OWUI data
**Solution**:
1. Modified feedbackStore to preserve original LangGraph data:
   - Added `langGraphThreads: LangGraphThread[]` to store original API data
   - Removed transformation logic that converted threads to conversations
   - Clear OWUI data when loading LangGraph data and vice versa

2. Created separate chat view components:
   - `LangGraphChatView` - Renders LangGraph threads with original structure
   - `OWUIChatView` - Renders OWUI conversations with ratings support
   - Different visual styles (icons vs avatars)

3. Updated ConversationDetail component:
   - Uses LangGraphChatView when dataSource is 'agent'
   - Uses OWUIChatView when dataSource is 'file'
   - Documents tab only appears for LangGraph data
   - Ratings tab only appears for OWUI data

4. Created new type definitions:
   - `src/types/langgraph.ts` - LangGraph-specific types preserving API structure

**Benefits:**
- LangGraph data remains in original format for accurate representation
- Clear separation between data sources
- Documents tab correctly handles only LangGraph format
- Ratings tab correctly handles only OWUI ratings
- Future flexibility for source-specific features

### Backend Docker Setup (Completed: 2025-01-13)
**Requirements**: Build a Docker setup for the backend
**Solution**:
1. Created comprehensive Docker configuration:
   - `.dockerignore` - Excludes unnecessary files from Docker build
   - `Dockerfile.production` - Multi-stage build for optimized production image
   - `Dockerfile.dev` - Development image with hot reloading
   - `docker-compose.yml` - Production orchestration
   - `docker-compose.dev.yml` - Development orchestration with PostgreSQL and pgAdmin
   - `Makefile` - Convenient commands for Docker operations
   - `DOCKER.md` - Comprehensive documentation

2. Key Features:
   - Multi-stage build reduces production image size
   - Non-root user for security
   - Health checks included
   - Chromium/Puppeteer support with Greek fonts
   - PostgreSQL integration
   - Development hot reloading
   - pgAdmin for database management
   - Environment variable configuration

3. Usage:
   ```bash
   # Development
   make up         # Start development environment
   make logs       # View logs
   make shell      # Access container shell
   
   # Production
   make build-prod # Build production image
   make up-prod    # Start production environment
   ```

## Pending Items

### 1. **ConversationDetail and ThreadDetail Components Merged**
**Date Added:** 2025-01-13
**Status:** Completed - Testing Required
**Description:** Merged ThreadDetail and ConversationDetail components into a single unified ConversationDetail component.

**Implementation Completed:**
1. Updated ConversationDetail to handle both file and agent data sources
2. Merged all ThreadDetail functionality into ConversationDetail:
   - Documents tab (shown only for agent data)
   - Different message styling based on data source
   - Different header text (Thread vs Conversation)
   - Different download filenames
   - Agent-specific export functionality
3. Added all necessary CSS classes from ThreadDetail to ConversationDetail.css
4. Updated App.tsx to only use ConversationDetail
5. Removed ThreadDetail component and its CSS file

**Benefits:**
- Single component to maintain
- Consistent behavior across data sources
- Easier to add new features
- Less code duplication

**Testing Required:**
- Verify file upload conversations still work correctly
- Verify agent-loaded conversations show Documents tab
- Test all functionality for both data sources

### 2. **CRITICAL: dataSource State Not Properly Maintained When Loading Agent Data**
**Date Added:** 2025-01-06
**Status:** Pending
**Description:** The dataSource state in feedbackStore is not being properly maintained when navigating between pages or after loading agent data. This causes issues with pagination and component rendering.

**Findings:**
1. **dataSource is properly set in feedbackStore:**
   - Line 226: `setDataSource('file')` when loading from file
   - Line 402: `setDataSource('agent')` when loading from agent threads
   - Line 151: `setDataSource(null)` in clearData function

2. **dataSource is properly cleared in clearData():**
   - The clearData function (lines 143-173) properly resets dataSource to null along with other state

3. **Potential Issues Identified:**
   - **No persistence mechanism**: dataSource is not saved to localStorage, so it's lost on page refresh
   - **loadData() doesn't restore dataSource**: The loadData function (lines 104-141) doesn't restore the dataSource state from any persistent storage
   - **Page navigation maintains state correctly**: The pagination logic in loadFromAgentThreads properly maintains the dataSource when navigating pages (line 402)

4. **App.tsx uses dataSource correctly:**
   - Lines 137-147: Conditionally renders ThreadDetail vs ConversationDetail based on dataSource

5. **ConversationList uses dataSource correctly:**
   - Line 162: Shows pagination only when dataSource === 'agent'

**Root Cause:** The dataSource state is lost on page refresh because it's not persisted to localStorage. The loadData() function, which runs on component mount, doesn't restore this state.

**Recommended Fix:**
1. Save dataSource to localStorage when it's set
2. Restore dataSource from localStorage in loadData() or component initialization
3. Consider saving other agent-related state (currentAgent, agentDateRange) to localStorage as well

### Backend TypeScript Build Errors
**Issue**: Backend has TypeScript compilation errors preventing successful build.
**Errors**:
- Express route handler type mismatches
- Missing HeadersInit type definition
- Missing conversation.types.js file
- Google Generative AI chat input property error
**Current Status**: Need to fix TypeScript configuration and type definitions.

### PromptSelectorModal Not Showing All Files
**Issue**: The dropdown in PromptSelectorModal isn't showing all files from the prompts folder.
**Investigation Steps**:
1. Added comprehensive logging to loadPromptFiles function
2. Enhanced GitHub service to log API response details and check for truncation
3. Implemented fallback to tree API for large directories (>100 files)
4. Added case-insensitive file extension matching (.txt, .md, .markdown)
5. Added alphabetical sorting of files in dropdown
6. Added logging for hidden files and other file types

**Potential Causes**:
- GitHub Contents API has a limit of 1000 files per directory
- Case sensitivity in file extensions (now fixed)
- Hidden files (starting with .) are now explicitly filtered
- API rate limiting or authentication issues

**Debug Output Added**:
- Prompts folder path being used
- Raw API response and file count
- Individual file filtering decisions
- Other file types found but not shown
- API response headers including rate limit info

**Current Status**: Enhanced with debugging and fallback mechanisms. User should check console logs when opening the modal.

**Issue**: Download buttons don't trigger any console output - click handlers not firing.
**Debug Steps Taken**:
1. Added console logging throughout the download flow
2. Added stopPropagation to prevent event bubbling
3. Fixed timestamp format (removed colons from filename)
4. Fixed date formatting for createdAt field
5. Added error handling with try/catch blocks
6. Removed React Portal implementation
7. Simplified click handlers
8. Added type="button" to all buttons
9. Added pointer-events: auto to CSS
10. Added direct inline onClick test

**Current Status**: 
- No console output when clicking buttons
- Click handlers appear not to be firing at all
- Need to verify if there's a CSS or DOM issue preventing clicks

## Completed Items

### Reusable Switch Component Created (Completed: 2025-01-06)
**Feature**: Created a reusable Switch component for toggle functionality throughout the application.
**Implementation**:
- Created `/src/components/Switch/` with Switch.tsx, Switch.css, and index.ts
- Supports multiple sizes (small, medium, large)
- Fully accessible with keyboard navigation and ARIA attributes
- Disabled state support
- Optional label text
- Dark mode compatible styling
- Uses CSS variables for theming

**Usage Examples**:
1. Basic switch: `<Switch checked={isOn} onChange={setIsOn} />`
2. With label: `<Switch checked={isOn} onChange={setIsOn} label="Enable feature" />`
3. Different sizes: `<Switch checked={isOn} onChange={setIsOn} size="large" />`
4. Disabled: `<Switch checked={isOn} onChange={setIsOn} disabled />`

**Additionally Created**:
- ViewModeSwitch component demonstrating two UI patterns:
  - Button group style for list/grid view switching
  - Toggle style using the Switch component
- Located in `/src/components/ViewModeSwitch/`
- Provides examples of how to implement view mode switching

### Button Hover Colors in Light Theme (Completed: 2025-01-09)
**Issue**: Button hover states in headers used white overlay (`rgba(255, 255, 255, 0.1)`) which doesn't work well in light theme.
**Solution**:
1. Added `--hover-bg` CSS variable to all theme configurations:
   - Dark themes: `rgba(255, 255, 255, 0.1)` (white overlay)
   - Light themes: `rgba(0, 0, 0, 0.05)` (black overlay)
2. Updated all button hover styles to use `var(--hover-bg)` instead of hard-coded values
3. Updated components:
   - ConversationDetail.css - header button hover states
   - DataControls.css - data control button hover
   - NoLogoHeader.css - header control button hover
   - ThemeToggle.css - theme toggle button hover
   - AnalyticsDashboard.css - export button hover
   - PromptSelectorModal.css - already referenced --hover-bg

**Implementation**:
- All button hover states now adapt properly to light/dark themes
- Consistent hover behavior across all components
- Header buttons remain white text on hover but with appropriate background

### LLM Prompt Server-Side Execution (Completed: 2025-01-09)
**Requirements**:
- Add Execute button in the LLMs/Prompts Modal
- Send model configuration, prompt text, and parameter values to server
- Support parameter types: Conversations, Q&As, current date/time, custom text
- Implement server-side endpoint for direct prompt execution

**Solution**:
1. Frontend Changes:
   - Added Execute button to PromptSelectorModal with loading state
   - Added parameter value building logic for different sources
   - Created executePromptWithParameters method in LLM service
   - Added execution result display with success/error states
   - Pass conversation prop from ConversationDetail to modal

2. Backend Changes:
   - Created new POST endpoint `/api/llm/execute-prompt-direct`
   - Implemented parameter substitution in prompt text
   - Used LangChain to execute prompts with selected LLM configuration
   - Added proper error handling and validation

3. UI/UX Improvements:
   - Execute button disabled when no model or prompt selected
   - Loading spinner during execution
   - Results displayed in styled container with close button
   - Success/error states with appropriate styling

**Implementation Details**:
- Parameter values for conversations/Q&As sent as JSON strings
- Date formats: YYYY-MM-DD for date, YYYY-MM-DD HH:mm:ss for datetime
- Custom text parameters use user-provided values
- Server replaces {parameterName} placeholders with actual values
- Response content properly extracted from LangChain response format

### LLM Tab Removal from Settings Modal (Completed: 2025-01-09)
**Requirements**:
- Remove the LLM tab from the Settings modal
- Clean up all LLM-related code and imports

**Solution**:
1. Removed the LLM tab button from the settings tabs section
2. Removed the LLM tab content panel
3. Updated TabType type definition to exclude 'llm'
4. Removed all LLM-related state variables (llmConfigurations, selectedLLM, defaultLLM, etc.)
5. Removed LLM-related imports (llmService, LLMConfiguration type)
6. Removed loadLLMConfigurations function and related handlers
7. Removed Brain icon import from lucide-react

**Implementation**:
- The Settings modal now only has two tabs: 'api' and 'github'
- Default tab remains 'api' as before
- All LLM-related functionality has been cleanly removed
- No orphaned imports or unused variables remain

### Backend NPM Vulnerabilities Fixed (Completed: 2025-01-08)
**Requirements**:
- Fix 5 high severity vulnerabilities in backend dependencies
- Update deprecated packages

**Solution**:
1. Updated package.json with latest secure versions:
   - puppeteer: 21.6.1 → 24.10.0 (fixes tar-fs and ws vulnerabilities)
   - express: 4.18.2 → 4.21.2
   - dotenv: 16.3.1 → 16.4.7
   - eslint: 8.56.0 → 9.18.0
   - TypeScript and other dev dependencies updated to latest versions
2. Moved @types packages from dependencies to devDependencies
3. Removed and reinstalled all packages

**Implementation**:
- All 5 high severity vulnerabilities resolved
- npm audit now reports 0 vulnerabilities
- All deprecated packages updated to supported versions
- Backend functionality remains intact with updated dependencies

### Backend ESLint Configuration for v9.x (Completed: 2025-01-08)
**Requirements**:
- Update backend to use ESLint 9.x flat config format
- Create proper configuration file for TypeScript linting

**Solution**:
1. Created `eslint.config.js` using the new flat config format
2. Configured TypeScript parser and plugin
3. Added recommended rules with additional TypeScript-specific rules
4. Updated package.json scripts to modern ESLint syntax

**Implementation**:
- Created flat config with proper TypeScript support
- Added ignore patterns for dist and node_modules
- Configured rules for type safety and code quality
- Added lint:fix script for automatic fixes
- Successfully validates code and reports legitimate issues

### Backend Module for Server-Side Operations (Completed: 2025-01-08)
**Requirements**:
- Create a separate backend module for server-side operations
- Support PDF generation with proper Greek character support
- Keep backend code totally separated from frontend

**Solution**:
1. Created a separate `backend` folder with Express/TypeScript server
2. Implemented PDF generation using Puppeteer for full Unicode support
3. Added REST API endpoints for conversation and Q&A pair exports
4. Integrated frontend with backend through API service
5. Added Docker support for both frontend and backend

**Implementation**:
- **Backend Structure**:
  - Express server with TypeScript configuration
  - Routes for `/api/export/conversation` and `/api/export/qa-pair`
  - Service layer using Puppeteer for PDF generation
  - HTML generation with proper UTF-8 encoding
  - Support for both PDF and HTML export formats
  
- **Frontend Integration**:
  - Created `ApiService` for backend communication
  - Updated download utilities to use backend for PDF generation
  - Added PDF options back to UI with "(Server)" label
  - Graceful fallback if backend is unavailable
  
- **Docker Setup**:
  - Separate Dockerfile for backend with Chromium/Puppeteer
  - Updated docker-compose.yml to run both services
  - Proper networking between frontend and backend containers
  
- **Features**:
  - Full Greek character support in PDFs
  - Markdown processing (bold, links, headings)
  - Styled HTML templates for professional output
  - Print-optimized CSS for PDFs

### PDF Export Removal (Completed: 2025-01-08)
**Requirements**:
- Remove PDF export functionality
- Clean up all PDF-related code

**Solution**:
1. Removed pdfUtils.ts file completely
2. Removed all PDF generation code from downloadUtils.ts
3. Updated component handlers to remove PDF format option
4. Removed PDF menu items from both conversation and Q&A download menus
5. Uninstalled pdf-lib and @pdf-lib/fontkit packages

**Implementation**:
- Removed downloadAsPDF function
- Removed PDF generation sections from formatConversationForDownload and formatQAPairForDownload
- Updated function signatures to exclude 'pdf' format type
- Removed PDF-related imports
- Reduced bundle size by ~1.1MB (from ~1.88MB to ~721KB)

### PDF Formatting with Markdown Support (Fixed: 2025-01-08)
**Requirements**:
- Apply similar formatting adjustments to PDF exports as done for DOCX
- Support markdown bold notation (**text**) and links [text](url)
- Support markdown headings (##, ###, etc.)
- Attempt to use fonts similar to Aptos

**Solution**:
1. Enhanced PDF generation to load both regular and bold fonts
2. Added markdown parsing for bold text and links in PDFs
3. Implemented heading detection and proper font sizing
4. Added support for loading Unicode fonts (Inter, Noto Sans, etc.)

**Implementation**:
- Updated `createPDFWithText` to accept heading properties
- Created `parseMarkdownForPDF` function to handle markdown syntax
- Links are displayed as "text (url)" in PDFs since PDF hyperlinks require more complex implementation
- Headings are rendered with appropriate font sizes and bold styling
- Font loading attempts Inter first (similar to Aptos), then falls back to other Unicode fonts
- Both regular and bold fonts are loaded for proper text styling

### Markdown Link Support in DOCX (Fixed: 2025-01-08)
**Requirements**:
- Convert markdown links [text](url) to proper DOCX hyperlinks

**Solution**:
1. Updated `parseMarkdownToTextRuns` to handle both bold notation and links
2. Used docx library's `ExternalHyperlink` component for proper link rendering

**Implementation**:
- Combined regex pattern matches both **bold** and [link](url) syntax
- Links are rendered with proper hyperlink styling in DOCX
- Function now returns array of TextRun or ExternalHyperlink objects
- Works throughout all DOCX content (messages, comments, headings)

### Markdown Heading Support in DOCX (Fixed: 2025-01-08)
**Requirements**:
- Map markdown headings (##, ###, etc.) to appropriate DOCX heading styles

**Solution**:
1. Enhanced the markdown parser utility to detect heading levels (# through ######)
2. Created `detectMarkdownHeading` function that returns heading level and text
3. Updated all DOCX generation code to process lines for heading detection
4. Applied heading styles with appropriate spacing

**Implementation**:
- Detects markdown heading syntax at the start of lines
- Maps # to HEADING_1, ## to HEADING_2, etc. up to HEADING_6
- Applies to all content areas: messages, comments, and Q&A pairs
- Preserves bold notation within heading text
- Fixed TypeScript error with HeadingLevel enum typing

### DOCX Formatting Updates (Fixed: 2025-01-08)
**Requirements**: 
- Use Aptos font throughout DOCX documents
- Remove all italic formatting
- Parse markdown bold notation (**text**) and convert to bold in DOCX

**Solution**:
1. Created a markdown parser utility (markdownParser.ts) to handle **bold** notation
2. Updated all DOCX generation to use Aptos font consistently
3. Removed all italic properties from TextRun objects
4. Applied markdown parsing to all content areas (messages, comments)

**Implementation**:
- All TextRun objects now include `font: 'Aptos'` property
- Removed `italics: true` from timestamps and comments
- Content with **bold text** is properly parsed and rendered as bold in DOCX
- Maintains all other formatting (headings, spacing, alignment)

### Multiple Export Formats with Greek Support (Fixed: 2025-01-08)
**Issue**: PDFs generated by the app showed ? characters instead of Greek text.
**Root Cause**: 
- Both jsPDF and pdf-lib have limited Unicode support with standard fonts
- Custom font embedding is complex and increases bundle size

**Solution**:
1. Added DOCX (Word document) export alongside PDF
2. Used the 'docx' library which handles Unicode text natively
3. Reimplemented PDF export with improved font loading from CDNs
4. Added fontkit support for custom font embedding
5. Now offers 4 export formats: JSON, Markdown, Word (DOCX), and PDF

**Implementation Details**:
- DOCX files display Greek characters perfectly without font embedding
- PDF generation attempts to load Unicode fonts (Noto Sans, Open Sans, Roboto) from CDNs
- Falls back to Helvetica with character replacement if font loading fails
- Separate utility module (pdfUtils.ts) handles PDF generation with font caching

**Trade-offs**:
- Bundle size increased to ~1.9MB due to pdf-lib and fontkit
- PDF Greek support depends on successful font loading from CDN
- DOCX provides guaranteed Greek character support
- Users can choose the format that best suits their needs

### Download Functionality Not Working (Investigating)

### PDF Generation Issues (Fixed: 2025-01-06)
**Issue**: PDFs generated by the app were unreadable/corrupted.
**Root Cause**: 
- The code was using `doc.setFont(undefined, 'bold')` which is invalid in jsPDF v3
- jsPDF v3 requires a font name as the first parameter
- Special Unicode characters (smart quotes, etc.) were causing encoding issues

**Solution**:
1. Fixed all `setFont` calls to use 'helvetica' as the font name
2. Added proper jsPDF initialization with explicit format settings
3. Added text cleaning to replace Unicode smart quotes with regular quotes
4. Added error handling with fallback to open PDF in new window if save fails
5. Applied fixes to both conversation and Q&A pair PDF generation

### Analytics Export Functionality (Completed: 2025-01-06)
**Feature**: Added export functionality to Analytics Dashboard as specified in requirements.
**Implementation**:
- Added export button to analytics header (second row, left of model selector)
- Created dropdown menu with JSON and Markdown export options
- Implemented export functions with full conversation/QA ID traceability
- Generated JSON with complete metrics data and filtering context
- Generated Markdown reports with formatted tables and statistics
- Included all metrics, filters, and timestamps in exports
- Respected current model and filter selections
- Used existing download utilities pattern from ConversationDetail component
- Ensured export button styling matches the header theme

### Download Menu Z-Index Issue (Fixed: 2025-01-06)
**Issue**: Download dropdown menus were being hidden behind Q&A message cards.
**Solution**: 
- Used React Portals to render dropdown menus at the document body level
- Implemented dynamic positioning using getBoundingClientRect
- Increased z-index values for proper stacking context
- Changed from absolute to fixed positioning with calculated coordinates
- This ensures dropdown menus always appear above all other content

### Theme Toggle Overlap Issue (Fixed: 2025-01-06)
**Issue**: Download button was overlapping with the theme toggle button.
**Solution**:
- Added padding-right to conversation header to create space
- Increased theme toggle z-index to 2000
- Added responsive design for mobile screens