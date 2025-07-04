# Issues - Pending Items

## Pending Items

### Direct process.env Access in Backend Code
**Date Added:** 2025-06-27
**Status:** Refactoring Required
**Description:** Multiple backend files still use direct `process.env` access instead of the new configuration service pattern.

**Files needing refactoring:**
- `src/index.ts` - Uses dotenv and direct process.env access
- `src/services/database.service.ts`
- `src/services/github.service.ts`
- `src/services/githubAssetService.ts`
- `src/services/assetDatabaseService.ts`
- `src/middleware/nbg-auth.config.ts`
- `src/middleware/token-validator.ts`
- `src/swagger.config.ts`
- `src/utils/console-controller.ts`
- `src/routes/debug.routes.ts`

**Recommendation:** Update these files to use the appropriate configuration service instead of direct environment variable access.

## Completed Items

### Migration to Configuration-Service-Pattern (Completed: 2025-06-27)
**Date Added:** 2025-06-27
**Status:** Completed
**Description:** Replaced the local configuration-repo pattern with the configuration-service-pattern from BikS2013/configuration-management.

**Changes Made:**
1. **Implemented @biks2013/config-service pattern:**
   - Created new configuration services in `/backend/src/services/config/`
   - Uses GitHub as primary source with PostgreSQL as fallback
   - Implements lazy initialization for environment variable timing
   - Factory pattern for creating singleton services

2. **Created Configuration Services:**
   - `environmentSettingsService.ts` - Loads environment variables from GitHub
   - `clientConfigService.ts` - Frontend configuration served via API
   - `agentConfigService.ts` - Agent configurations
   - `llmConfigService.ts` - LLM provider settings
   - `promptConfigService.ts` - Prompt templates
   - `promptFileService.ts` - Individual prompt files
   - `config-factory.ts` - Factory pattern implementation
   - `config-clients.ts` - Lazy-initialized GitHub and database clients

3. **Updated Routes and Services:**
   - Configuration route now uses new client config service
   - Debug routes use new environment settings service
   - Agent service uses new agent config service
   - LLM routes use new LLM config service
   - All prompt services use new prompt file service

4. **Removed Old Files:**
   - `/backend/env-settings.example`
   - `/backend/config/configuration.template.json`
   - `/backend/config/client-config.example.json`
   - `/backend/config/README.md`
   - `/backend/src/types/environment-configuration.ts`
   - `/backend/test_scripts/test-env-settings-debug.sh`
   - `/backend/src/services/assetDatabaseService.ts` - Removed as unused
   - `/backend/src/services/githubAssetService.ts` - Removed along with assets endpoints
   - `/backend/src/routes/assets.ts` - Removed assets API endpoints

**Benefits:**
- Centralized configuration in GitHub repository
- Automatic caching to PostgreSQL database
- No need to rebuild/redeploy for configuration changes
- Type-safe configuration access
- Follows established patterns from configuration management repository
- Cleaner separation between configuration management and general asset serving

### LLM Execution Service Implementation (Completed: 2025-06-27)
**Date Added:** 2025-06-27
**Status:** Completed
**Description:** Implemented LLM execution service using LangChain to communicate with various LLM providers.

**Changes Made:**
1. **Created LLMExecutionService** (`/backend/src/services/llmExecutionService.ts`):
   - Singleton service for managing LLM model creation and caching
   - Supports multiple providers: OpenAI, Azure OpenAI, Anthropic, Google
   - Automatically reads API keys from environment variables if not in config
   - Implements model caching to avoid recreating models for repeated requests

2. **Supported LLM Providers:**
   - **OpenAI**: Uses `OPENAI_API_KEY` environment variable
   - **Azure OpenAI**: Uses `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_ENDPOINT`, `AZURE_OPENAI_API_VERSION`
   - **Anthropic**: Uses `ANTHROPIC_API_KEY` environment variable
   - **Google**: Uses `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` environment variables

3. **Updated LLM Routes:**
   - `/api/llm/test` endpoint now executes actual LLM calls instead of returning mock responses
   - `/api/llm/execute-prompt-direct` endpoint fully functional for direct prompt execution
   - `/api/llm/convert-to-filter` endpoint ready for natural language to filter conversion
   - Model cache is cleared when configurations are reloaded

4. **Configuration Updates:**
   - Extended `llmConfigService` with `createChatModel` method
   - Fixed configuration structure to support both legacy `llmProviders` and new `configurations` array
   - Updated `getConfigurationByName` helper to find configurations from the actual YAML structure

**Benefits:**
- Real LLM execution capability for all configured providers
- Efficient model caching to improve performance
- Flexible configuration with environment variable fallbacks
- Support for provider-specific configurations (Azure endpoints, Google output tokens, etc.)

### Client Configuration via Configuration-Service-Pattern (Completed: 2025-01-23)
**Date Added:** 2025-01-23
**Status:** Completed
**Description:** Implemented the configuration-service-pattern to fetch client configuration from the GitHub configuration repository.

**Changes Made:**
1. **Created ClientConfigService:**
   - New service at `/backend/src/services/clientConfigService.ts`
   - Follows the standard configuration-service-pattern
   - Loads configuration from GitHub asset repository using `CLIENT_SETTINGS` environment variable
   - Falls back to local `configuration.json` if GitHub unavailable
   - Provides reload functionality

2. **Updated Configuration Route:**
   - Modified `/configuration` endpoint to use ClientConfigService
   - Added `/configuration/reload` POST endpoint
   - Configuration sources priority:
     1. Environment variables (highest - can override)
     2. GitHub configuration repository 
     3. Local configuration.json (fallback)
   
3. **Environment Configuration:**
   - Added `CLIENT_SETTINGS=settings/client-config.json` to `.env`
   - Updated `.env.example` with documentation

4. **Tab Visibility Implementation:**
   - Added `getTabVisibility()` method to frontend EnvironmentConfigurationService
   - ConversationDetail component now properly hides tabs based on configuration
   - Tabs refresh on window focus to reflect configuration changes

**Benefits:**
- Centralized configuration management in GitHub repository
- No need to rebuild/redeploy for configuration changes
- Environment variables can still override for specific deployments
- Consistent with other configuration patterns in the application

### Configuration Simplification (Completed: 2025-01-23)
**Date Added:** 2025-01-23
**Status:** Completed
**Description:** Simplified the configuration system to only include the required fields as specified by the user.

**Changes Made:**
1. **Removed all configuration fields except**:
   - `environment` (development/staging/production)
   - `version` (application version)
   - `timestamp` (ISO 8601 timestamp)
   - `features` object containing only:
     - `show_documents`
     - `show_runs`
     - `show_checkpoints`

2. **Removed base_api_url**:
   - As requested by user, this is provided through other means (Docker env vars, .env file)
   - Not included in configuration.json

3. **Updated all related files**:
   - TypeScript interfaces (frontend and backend)
   - Configuration service
   - Configuration routes
   - Settings Modal
   - Documentation

**Benefits:**
- Cleaner, simpler configuration structure
- Only contains settings that need runtime modification
- API URL managed separately through existing mechanisms
- Easier to understand and maintain

### Feature Flags Environment Variables Documentation (Completed: 2025-01-23)
**Date Added:** 2025-01-23
**Status:** Completed
**Description:** The feature flags (SHOW_DOCUMENTS, SHOW_RUNS, SHOW_CHECKPOINTS) are used in the backend configuration route but were not documented in the .env.example file.

**Actions Taken:**
1. Added the missing environment variables to `/backend/.env.example` with documentation
2. These variables control the visibility of tabs in the UI when viewing agent conversations
3. Default value is true for all flags if not specified
4. Fixed backend configuration route to properly merge environment variables as fallback
5. Updated configuration route path to correctly locate config.json file
6. Verified environment variables (SHOW_DOCUMENTS=false, etc.) are now properly displayed in Settings Modal

**Implementation Details:**
- Runtime configuration via `/public/config.json` (highest priority)
- Environment variables as fallback (when config.json doesn't specify these flags)
- Configuration source tracking shows "env" when values come from environment variables
- Settings Modal now correctly displays false values from .env file instead of undefined

### Configuration Management Alignment (Completed: 2025-01-21)
**Date Added:** 2025-01-21
**Status:** Completed
**Description:** Aligned the app's configuration management with the guidelines from configuration-management-in-react-apps.md

**Changes Made:**
1. **Nginx Dynamic Configuration:**
   - Created `nginx.conf.template` to serve dynamic config.json from environment variables
   - Updated to use `API_BASE_URL` environment variable
   - config.json now served dynamically with only API base URL

2. **Docker Configuration:**
   - Updated Dockerfile to use `API_BASE_URL` instead of `API_URL`
   - Environment variable substitution working properly
   - Removed static config.json file from build

3. **API-Based Configuration:**
   - Added `fetchConfigurationFromAPI` method to EnvironmentConfigurationService
   - App now fetches full configuration from `/api/configuration` endpoint
   - Created backend configuration route to serve environment-specific settings

4. **Backend Configuration Endpoint:**
   - Created `/api/configuration` route in backend
   - Returns full configuration based on environment variables
   - No authentication required for initial configuration fetch
   - Supports all configuration sections (features, UI, API, security, etc.)

5. **Configuration Flow:**
   - Step 1: Fetch minimal config.json from nginx (API base URL only)
   - Step 2: Use API base URL to fetch full configuration from backend
   - Step 3: Fall back to build-time config if API unavailable
   - Step 4: Use environment defaults as last resort

**Benefits:**
- No configuration embedded in container images
- Runtime configuration without rebuilds
- Environment-specific settings from backend
- Clean separation of concerns
- Follows best practices for containerized React apps

### NBG OAuth Authentication - Bypass When Disabled (Completed: 2025-06-21)
**Date Added:** 2025-06-21
**Status:** Completed
**Description:** Modified authentication middleware to properly bypass authentication when NBG_OAUTH_ENABLED is set to false.

**Changes Made:**
1. **Token Validator Middleware:**
   - Added check for `isAuthEnabled()` in `requireAuth` function
   - When auth is disabled, sets mock auth object and bypasses validation
   - `requireRole` middleware also bypasses checks when auth is disabled
   - `optionalAuth` sets mock auth when disabled for consistency

2. **Auth Routes:**
   - `/api/auth/status` returns `authenticated: true` when auth is disabled
   - Provides mock user data in development mode
   - Login endpoint returns error when auth is disabled

3. **Global Auth Middleware:**
   - Sets mock auth object when auth is disabled
   - Ensures downstream code that checks `req.auth` works properly

4. **Config Module:**
   - Returns mock config when auth is disabled to prevent errors
   - Prevents "missing configuration" errors during startup

**Benefits:**
- No authentication prompts when `NBG_OAUTH_ENABLED=false`
- Development mode works without OAuth configuration
- All protected endpoints accessible in dev mode
- Consistent behavior across all middleware

### OAuth Authentication Implementation Analysis
**Date Added:** 2025-06-20
**Status:** Analysis Complete - Implementation Planning Required
**Description:** Analyzed the backend codebase to understand current authentication state and create OAuth implementation plan.

**Findings:**
1. **No Existing Authentication:**
   - No authentication middleware currently exists
   - No JWT or session management dependencies installed
   - All API endpoints are publicly accessible
   - No user context in current implementation

2. **Sensitive Endpoints Identified:**
   - High Priority: Export endpoints, Agent database access, LLM operations, GitHub operations, Asset management
   - Medium Priority: Configuration reloads, Test endpoints
   - Low Priority: Health checks, Read-only status endpoints

3. **CORS Ready for OAuth:**
   - Authorization header already allowed in CORS configuration
   - Credentials support enabled
   - Dynamic origin validation supports multiple frontends

4. **Documentation Created:**
   - Created `/backend/docs/OAUTH-ANALYSIS.md` with comprehensive analysis
   - Includes endpoint classification, implementation considerations, and recommendations

**Next Steps:**
1. Decide on OAuth provider(s) to support
2. Choose JWT validation library
3. Determine which endpoints should remain public
4. Define user context and RBAC requirements
5. Implement phased OAuth rollout

### Dead Code in Backend Module
**Date Added:** 2025-06-20
**Status:** Analysis Complete - Cleanup Required
**Description:** Found unused service file and exports in the backend module during dead code analysis.

**Findings:**
1. **Completely Unused Service File:**
   - `executeDirectPromptService.ts` - Never imported anywhere
   - Exports: `getExecuteDirectPromptContent`, `prepareExecuteDirectPrompt`, `reloadExecuteDirectPrompt`
   
2. **Unused Service Exports:**
   - `agentConfigService.ts`: `getAgentConfigService()` function is never called directly
   
3. **All Other Components Are Used:**
   - All route files are properly registered
   - All utility files are imported and used
   - All type files are referenced
   - All database service methods are called

**Recommendation:** Remove `executeDirectPromptService.ts` file as it appears to be obsolete code.

### App Refreshes When Switching Focus (Enhanced: 2025-06-21)
**Date Added:** 2025-06-21
**Status:** Enhanced - Optimized
**Description:** The app was refreshing/re-rendering when switching focus to another app and returning back.

**Root Cause:** 
- AuthContext was checking authentication status on every window focus event
- This caused unnecessary re-renders even though data wasn't reloading

**Solution Implemented (Two-Part Fix):**

**Part 1 - Rate Limiting:**
1. Added `lastAuthCheck` timestamp tracking to AuthContext
2. Modified focus event handler to only check auth if 5+ minutes have passed
3. Prevents frequent auth checks while maintaining security

**Part 2 - Smart State Updates:**
1. Modified `checkAuth` to only update state when authentication actually changes
2. Skips state updates (and re-renders) if auth status remains the same
3. Only triggers re-renders when:
   - Initial auth check on app load
   - User becomes authenticated
   - User becomes unauthenticated
4. Added console logging to track auth checks and state updates

**Changes:**
- `src/contexts/AuthContext.tsx`:
  - Added conditional state updates based on auth status changes
  - Removed loading state updates for background checks
  - Added error handling that only updates state when necessary
  - Added debug logging for auth check behavior

**Benefits:**
- No unnecessary re-renders when auth status unchanged
- Background auth checks are now "silent" unless user logs out
- Maintains security while maximizing performance
- Better user experience with stable UI state

### Azure PostgreSQL Connection Timeouts
**Issue**: Database connections to Azure PostgreSQL are timing out with "Connection terminated due to connection timeout" errors
**Impact**: Unable to fetch thread data from agent databases
**Status**: Improvements implemented, needs testing
**Details**:
- Azure PostgreSQL requires longer connection timeouts than local databases
- May need firewall rule updates to allow connections from the application's IP
- SSL/TLS configuration may need adjustment

**Implemented Solutions**:
1. Increased connection timeout from 5s to 30s for Azure databases
2. Added retry logic with exponential backoff (3 attempts)
3. Enhanced error logging to identify timeout causes
4. Added connection pool monitoring
5. Created test connection endpoint: GET /api/agent/test-connection/{name}

**Next Steps**:
- Test the connection using the new test endpoint
- Verify Azure PostgreSQL firewall rules allow the application's IP
- Monitor connection pool statistics during usage

## Completed Items (Most Recent First)

### Client App Configuration Pattern Implementation (Completed: 2025-01-21)
**Date Added:** 2025-01-21
**Status:** Completed
**Description:** Implemented the client app configuration pattern for environment parameters according to guidelines from BikS2013/ClaudeGuide.

**Implementation Details:**
1. **Created Configuration Infrastructure:**
   - `src/types/environment-config.ts` - Type definitions for environment configuration
   - `src/services/environment-config.service.ts` - Service to manage configuration loading
   - `public/config.json` - Default runtime configuration file

2. **Configuration Sources (Priority Order):**
   - Runtime Configuration (config.json) - Highest priority
   - Build-time Configuration (.env variables) - Fallback
   - Default Configuration - Environment-specific defaults

3. **Enhanced Components:**
   - Updated `configLoader.ts` to use EnvironmentConfigurationService
   - Enhanced `storageUtils.ts` with async methods for configuration access
   - Updated `SettingsModal` to show environment and configuration source
   - Added synchronous fallback methods for backward compatibility

4. **Key Features:**
   - Automatic environment detection (development/staging/production)
   - Configuration source tracking (runtime/buildtime/default)
   - Type-safe access to all configuration values
   - Comprehensive configuration including features, UI, API, GitHub, security, monitoring
   - Support for environment-specific feature toggles

5. **Documentation:**
   - Updated CLAUDE.md with detailed configuration pattern documentation
   - Added .gitignore entry for local config overrides (config.local.json)

**Benefits:**
- Applications can run in different environments without code changes
- Runtime configuration changes without rebuilding
- Clear visibility of configuration source in Settings modal
- Type-safe configuration access throughout the application

### Fixed Server Crash When Changing NBG_OAUTH_ENABLED (Completed: 2025-06-21)
**Date Added:** 2025-06-21
**Status:** Completed
**Description:** Server was crashing with EADDRINUSE error when changing NBG_OAUTH_ENABLED due to rapid restarts.

**Solution Implemented:**
1. **Increased nodemon delay** from 2.5 to 4 seconds in nodemon.json
2. **Added shutdown lock mechanism** using a lock file to prevent startup during shutdown
3. **Improved graceful shutdown:**
   - Track active connections and destroy them immediately
   - Create/remove shutdown lock file during shutdown process
   - New instance waits up to 10 seconds for lock to be removed
4. **Added shutdown lock to .gitignore**

**Benefits:**
- Prevents port conflicts during rapid environment variable changes
- Ensures clean shutdown before new instance starts
- More reliable development experience

### Environment Settings Loading from Configuration Repository (Completed: 2025-06-20)
**Requirements**: Implement loading of environment variables from GitHub configuration repository using ENV_SETTINGS_ASSET_KEY
**Solution**: Created a new environment settings service following the Configuration Service Pattern
**Implementation**:
1. Created `environmentSettingsService.ts` that follows the standard configuration service pattern
2. Loads environment settings from a JSON file in the GitHub configuration repository
3. Settings are loaded on application startup before the server starts
4. Existing environment variables are preserved by default (can override with OVERRIDE_ENV_VARS=true)
5. Added reload functionality via POST /api/debug/env/reload endpoint
6. Added ENV_SETTINGS_ASSET_KEY to debug env endpoint to show current configuration

**Features**:
- Centralized environment configuration in GitHub repository
- Dynamic reloading without server restart
- Graceful fallback if settings file doesn't exist
- Logging shows which settings were loaded/skipped
- Test script created: `test_scripts/test-env-settings.sh`
- Example configuration file: `environment-settings.example.json`

**Usage**:
1. Create a JSON file with key-value pairs for environment settings
2. Upload to GitHub configuration repository
3. Set `ENV_SETTINGS_ASSET_KEY=settings/environment-settings.json` in .env
4. Settings load automatically on startup or can be reloaded via API

### LLM Configuration Caching Not Working (Completed: 2025-06-20)
**Issue**: The LLM Config Service was fetching configurations from GitHub on every request instead of caching them
**Impact**: Performance degradation and unnecessary API calls to GitHub
**Resolution**: Fixed by removing the proxy export pattern in the service
**Details**: 
- The issue was caused by a proxy object in llm-config.service.ts that was intercepting property assignments
- The proxy only had a `get` trap but no `set` trap, preventing the `initialized` flag from being properly set
- Removed the proxy export (`export const llmConfigService = new Proxy(...)`) entirely
- All routes were already using `getLLMConfigService()` directly, so no route changes were needed
- Now configurations are loaded once from GitHub and cached in memory for the lifetime of the application
- Subsequent requests use the cached configurations as confirmed by logs showing "✅ Using cached LLM configurations"

### Execute Button Styling in Magic Mode (Completed: 2025-01-15)
**Issue**: The Execute button in magic mode used different styling (green) compared to the Generate button in engineering mode (blue gradient).
**Solution**:
1. Changed the Execute button's CSS class from `apply-filter-btn` to `generate-btn`
2. Added the Sparkles icon to the Execute button for consistency
3. Both buttons now use the same blue gradient styling and icon

**Implementation Details**:
- Engineering mode Generate button: `generate-btn` class with blue gradient
- Magic mode Execute button: Now also uses `generate-btn` class with blue gradient
- Both buttons show the Sparkles icon when not loading
- Consistent hover effects and disabled states
- Maintains the same visual appearance across both display modes

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

### Docker Runtime Configuration Not Working
**Date Added:** 2025-01-16
**Status:** Debugging Added - Testing Required
**Description:** Runtime configuration via `-e API_URL=...` in Docker isn't working, app falls back to build-time value.

**Investigation and Debug Steps Added:**
1. **Enhanced configLoader.ts with extensive logging:**
   - Logs current location, build-time config, fetch URL
   - Logs response status, headers, and raw response
   - Logs parse attempts and fallback behavior
   - Uses absolute URL with `window.location.origin` for fetch

2. **Updated SettingsModal to show runtime config status:**
   - Added runtime config status indicator (loading/runtime/buildtime)
   - Shows which configuration source is active
   - Updated documentation to reflect runtime configuration support
   - Fixed incorrect documentation about Docker runtime config

3. **Created debugging tools:**
   - `test_scripts/test-docker-config.sh` - Shell script to test Docker configuration
   - `test_scripts/debug-config.html` - HTML page to test config endpoint directly
   - Both tools help identify where the configuration flow is breaking

**Next Steps:**
1. Build and run Docker container with runtime config:
   ```bash
   docker build -t owui-feedback-ui .
   docker run -e API_URL=http://localhost:3120/api -p 8080:80 owui-feedback-ui
   ```
2. Check browser console for `[ConfigLoader]` debug messages
3. Run `./test_scripts/test-docker-config.sh` to verify nginx configuration
4. Access `http://localhost:8080/test_scripts/debug-config.html` to test endpoint directly

**Potential Issues to Check:**
- CORS or security policies blocking the fetch
- Base URL or public path configuration issues
- Nginx not properly substituting the environment variable
- Cache issues preventing config reload

### Display Mode Differences in Natural Language Filter Generation
**Date Added:** 2025-01-14
**Status:** Investigation Complete
**Description:** Scripts generated in magic mode might be different from those in engineering mode, but investigation shows they are currently identical.

**Findings:**
1. **Frontend FilterPanel Component:**
   - The `displayMode` state is tracked in FilterPanel (line 38)
   - Display mode only affects UI visibility, not the actual API calls
   - Both modes call the same `executeNaturalLanguageQuery` function
   - The API request body sent to backend is identical for both modes:
     ```javascript
     {
       llmConfiguration: selectedLLM,
       query: naturalQuery,
       sampleData: currentThread // if available
     }
     ```

2. **Backend Processing:**
   - The `/api/llm/convert-to-filter` endpoint (lines 889-1159 in llm.routes.ts)
   - No display mode information is passed to the backend
   - The same prompt template is used regardless of how the user triggered generation
   - Script generation logic is identical for all requests

3. **UI Differences Between Modes:**
   - **Engineering Mode:**
     - Shows separate Generate, Show Prompt, and Apply Filter buttons
     - Displays generated scripts before applying
     - Allows viewing the prompt that will be sent to LLM
   - **Magic Mode:**
     - Shows only a single Apply button
     - Automatically generates and applies filter in one action
     - Hides the intermediate steps from the user

**Conclusion:** The scripts generated are identical between magic and engineering modes. The difference is purely in the UI/UX presentation. Magic mode simplifies the workflow by combining generate + apply into a single action, while engineering mode provides visibility into the intermediate steps.

**No Action Required:** The current implementation is working as designed. Both modes generate the same scripts using the same backend logic.

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

### Configuration Policy - No Defaults or Fallbacks (Completed: 2025-01-23)
**Date Added:** 2025-01-23  
**Status:** Completed  
**Description:** Implemented strict configuration policy: No default or fallback values allowed. All configuration must come from explicit sources.

**Policy as specified by user:**
- "You must never create fallback solutions for configuration settings"
- "In every case a configuration setting is not provided you must raise the appropriate exception"
- "Never substitute the missing config value with a default or a fallback value"

**Changes Made:**
1. **Updated CLAUDE.md:**
   - Added explicit policy documentation
   - Configuration must come from explicit sources only
   - Missing configuration should throw errors, not provide defaults

2. **Backend ClientConfigService:**
   - Removed ALL fallback logic
   - Throws explicit errors when configuration is missing
   - No default values anywhere in the service

3. **Frontend EnvironmentConfigurationService:**
   - Removed all default values from getter methods
   - Removed `|| 'default'` fallback patterns
   - Removed `?? true` fallback patterns  
   - All getters now throw errors when configuration is missing
   - Updated type definitions to remove 'default' as a config source option
   - Build-time configuration now requires explicit environment variables

**Benefits:**
- Explicit configuration requirements
- Early detection of misconfiguration
- No hidden defaults that can cause confusion
- Clear error messages when configuration is missing

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