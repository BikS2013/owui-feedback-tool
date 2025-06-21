# Configuration Directory

This directory contains the configuration files for the OWUI Feedback backend API.

## Files

### configuration.json
The main configuration file that is served by the `/configuration` endpoint. This file contains runtime configuration settings that can be modified without rebuilding the application.

**Note:** This file is ignored by git. Copy `configuration.template.json` to `configuration.json` and modify as needed.

### configuration.template.json
A template file showing the structure and available options for the configuration.

## Configuration Structure

```json
{
  "environment": "production | staging | development",
  "version": "1.0.0",
  "timestamp": "ISO 8601 timestamp",
  "features": {
    "show_documents": true,    // Show Documents tab in UI
    "show_runs": true,         // Show Runs tab in UI
    "show_checkpoints": true   // Show Checkpoints tab in UI
  }
}
```

**Note:** The `base_api_url` is NOT included in this configuration file. The API URL is configured separately through:
- Docker environment variables for runtime configuration
- `.env` file (VITE_API_URL) for build-time configuration
- Default values for development

## Configuration Priority

The configuration system follows this priority order:

1. **configuration.json values** - Highest priority
2. **Environment variables** - Used as fallback when not specified in configuration.json
   - `SHOW_DOCUMENTS`
   - `SHOW_RUNS`
   - `SHOW_CHECKPOINTS`
3. **Default values** - Used when neither configuration.json nor environment variables are set

## Usage

The client application fetches configuration from the `/configuration` endpoint on startup. This allows for runtime configuration changes without rebuilding the client application.

### Example Response

```json
{
  "environment": "production",
  "version": "1.0.0",
  "timestamp": "2025-01-21T10:30:00Z",
  "features": {
    "show_documents": true,
    "show_runs": false,
    "show_checkpoints": true
  },
  "_configSources": {
    "show_documents": "config.json",
    "show_runs": "env",
    "show_checkpoints": "config.json"
  }
}
```

The `_configSources` object indicates where each configuration value comes from:
- `"config.json"` - Value from configuration.json file
- `"env"` - Value from environment variable
- `"undefined"` - No value set (will be undefined in the response)