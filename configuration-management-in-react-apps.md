Regarding the configuration management of a React application, there are the following key points to consider:

React applications are deployed as static files, which means that at run time, the application does not have access to the file system of the machine hosting the files delivered to the browser. This means that the application cannot embbed configuration settings directly in the html/js files.

In contrast, during the development time, the application is running in a node server context, which means that it has access to the environment variables of the machine hosting the node server. This means that the application can embed configuration settings directly in the html/js files.

Based on the above, there are two major concerns we have to arrange: 

1. How to provide to the application the API's base URL, in a way that doesn't requires to embbed the URL in the container image at the build time. The solution for this is to guide the nginx during the image build time to create a predefined endpoint (`/config.json`) which will respond with a minimal configuration settings file, that contains only the API's base url - nothing else. The value of the API_BASE_URL is provided by the nginx server at runtime, based on the `API_BASE_URL` environment variable.
So through this way at client app's URL `http://localhost:8080/config.json` there is a configuration setting which can be used to configure the API's calls. 
Of course during the development time, the `API_BASE_URL` is provided by the .env file, so the implementation must be dual: To support .env file based configuration during development, and to support the `/config.json` endpoint based configuration in production.
  
2. After the client app has access to the API's base URL, it will make a call to get from the API the full configuration settings, which will not include the API's base URL, given that this parameter is already defined and agreed. 
Again all the parameters provided this way are primarily runtime parameters. which means that during development time parameters can also be provided by the .env file. In case that during development time there are both API_BASE_URL/config.json and .env based configuration, the .env based configuration will take precedence.

So when the client app starts, and after the API's base URL is defined, the client app must make a call to the API to get the full configuration settings.

## Implementation Details

### Backend Configuration Service

The backend now implements a `ClientConfigService` that follows the configuration-service-pattern to load client configuration from a GitHub repository:

1. **Environment Variable Setup:**
   ```
   CLIENT_SETTINGS=settings/client-config.json
   ```

2. **Configuration Structure:**
   ```json
   {
     "environment": "production",
     "version": "1.0.0",
     "timestamp": "2025-01-23T10:00:00Z",
     "features": {
       "show_documents": true,
       "show_runs": false,
       "show_checkpoints": false
     }
   }
   ```

3. **Service Features:**
   - Loads configuration from GitHub using `GitHubAssetService`
   - Falls back to local `configuration.json` if GitHub unavailable
   - Supports database caching for better performance
   - Provides reload functionality without server restart

### Configuration Priority

1. **Environment Variables** (highest priority)
   - Can override any configuration value
   - Example: `SHOW_DOCUMENTS=false` overrides GitHub config

2. **GitHub Configuration Repository**
   - Primary source for configuration
   - No rebuild/redeploy needed for changes
   - Centralized management across environments

3. **Local configuration.json** (fallback)
   - Used when GitHub is unavailable
   - Located at `/backend/config/configuration.json`

### API Endpoints

- **GET /configuration** - Returns merged configuration from all sources
- **POST /configuration/reload** - Reloads configuration from GitHub

### Frontend Integration

The frontend's `EnvironmentConfigurationService`:
- Fetches configuration from backend on startup
- Provides `getTabVisibility()` method for UI components
- Handles configuration source tracking
- Falls back gracefully when backend unavailable

### Benefits

- **No Embedded Configuration:** Configuration not baked into container images
- **Runtime Updates:** Change configuration without redeployment
- **Centralized Management:** Single source of truth in GitHub
- **Environment Flexibility:** Override with env vars when needed
- **Performance:** Database caching reduces GitHub API calls 