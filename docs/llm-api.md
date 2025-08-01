# LLM API Documentation

This document provides comprehensive documentation for all LLM (Large Language Model) related API endpoints in the backend service. These endpoints facilitate interaction with various LLM providers, configuration management, and prompt execution.

## Table of Contents
- [Overview](#overview)
- [LLM Configuration Management](#llm-configuration-management)
- [LLM Testing Endpoints](#llm-testing-endpoints)
- [Prompt Execution Endpoints](#prompt-execution-endpoints)
- [Natural Language Processing Endpoints](#natural-language-processing-endpoints)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Supported Providers](#supported-providers)

## Overview

The LLM API provides a unified interface for managing and interacting with multiple LLM providers. It supports:
- Dynamic configuration loading from GitHub registry
- Multiple provider support (OpenAI, Anthropic, Google, Azure, etc.)
- Configuration testing and validation
- Direct prompt execution
- Natural language to code conversion
- Model response caching for performance

All endpoints follow RESTful conventions and return JSON responses.

## LLM Configuration Management

### LLM Configuration Retrieval Process

The LLM configuration is stored as a YAML file in the GitHub registry. When API endpoints need to return LLM information, they follow this process:

1. **Asset Retrieval**: The API retrieves the YAML configuration file from the GitHub registry using the asset key specified in the `LLM_CONFIG_ASSET_KEY` environment variable.

2. **YAML Parsing**: The retrieved YAML content is parsed to extract the LLM configurations.

3. **Data Transformation**: The parsed YAML data is converted to the API response format, which includes:
   - Extracting provider names, models, and configuration parameters
   - Determining the default configuration
   - Formatting the data according to the API's JSON response structure

4. **API Key Resolution**: For each configuration, the system checks for corresponding API keys in environment variables.

5. **Caching**: The configuration is cached in memory to avoid repeated GitHub API calls for subsequent requests.

### 1. Get All LLM Configurations

Retrieves a list of all configured LLM providers and models. This endpoint internally fetches the configuration from GitHub registry and transforms it to the expected response format.

**Endpoint:** `GET /api/llm/configurations`

**Internal Process:**
1. Fetches the YAML configuration from GitHub using `LLM_CONFIG_ASSET_KEY`
2. Parses the YAML to extract LLM configurations
3. Validates which configurations have API keys available
4. Returns the formatted JSON response with enabled configurations

**Response:**
```json
{
  "configurations": [
    {
      "name": "gpt-4",
      "provider": "openai",
      "model": "gpt-4",
      "description": "OpenAI GPT-4 - Most capable model for complex tasks",
      "enabled": true
    },
    {
      "name": "gpt-3.5-turbo",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "description": "OpenAI GPT-3.5 Turbo - Fast and efficient for most tasks",
      "enabled": true
    }
  ],
  "defaultConfiguration": "gpt-3.5-turbo"
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Configuration loading failed

### 2. Reload LLM Configuration

Forces a fresh retrieval of the LLM configuration from the GitHub registry, clearing any cached data.

**Endpoint:** `POST /api/llm/reload`

**Internal Process:**
1. Clears the in-memory cache of LLM configurations
2. Fetches the latest YAML configuration from GitHub using `LLM_CONFIG_ASSET_KEY`
3. Parses and validates the new configuration
4. Reinitializes all LLM model instances
5. Updates the cache with the fresh data

**Response:**
```json
{
  "success": true,
  "message": "LLM configurations reloaded successfully",
  "configurationsLoaded": 2
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Configuration reload failed

## LLM Testing Endpoints

### 3. Test LLM Configuration

Tests a specific LLM configuration with a simple prompt to verify connectivity and functionality.

**Endpoint:** `POST /api/llm/test`

**Request Body:**
```json
{
  "configurationName": "gpt-4",
  "prompt": "Hello, how are you?"  // Optional, defaults to a greeting
}
```

**Response (Success):**
```json
{
  "success": true,
  "configuration": "gpt-4",
  "response": "Hello! I'm doing well, thank you for asking. How can I assist you today?",
  "duration": 1245
}
```

**Response (Failure):**
```json
{
  "success": false,
  "configuration": "gpt-4",
  "error": "API key not found or invalid",
  "duration": 50
}
```

**Status Codes:**
- `200 OK`: Test completed (check `success` field)
- `400 Bad Request`: Missing configuration name
- `404 Not Found`: Configuration not found

## Prompt Execution Endpoints

### 4. Execute Prompt Directly

Executes a prompt with parameter substitution using a specified LLM configuration.

**Endpoint:** `POST /api/llm/execute-prompt-direct`

**Request Body:**
```json
{
  "llmConfiguration": "gpt-3.5-turbo",
  "promptText": "Analyze the following data: {{data}} and provide insights about {{topic}}",
  "parameterValues": {
    "data": "Sales increased by 25% in Q3",
    "topic": "revenue growth"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt executed successfully",
  "result": "Based on the data provided, the 25% sales increase in Q3 represents significant revenue growth..."
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing required parameters
- `404 Not Found`: LLM configuration not found
- `500 Internal Server Error`: Execution failed

## Natural Language Processing Endpoints

### 5. Convert Natural Language to Filter

Converts natural language queries into executable JavaScript filter functions for data processing.

**Endpoint:** `POST /api/llm/convert-to-filter`

**Request Body:**
```json
{
  "llmConfiguration": "gpt-4",
  "query": "Show me all conversations longer than 10 messages that mention refunds",
  "sampleData": {
    "id": "123",
    "messages": [],
    "metadata": {
      "topic": "refund request"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "responseType": "filter",
  "filterScript": "function filter(item) {\n  return item.messages && item.messages.length > 10 && \n    JSON.stringify(item).toLowerCase().includes('refund');\n}",
  "renderScript": null,
  "rawResponse": "...",
  "usedSampleData": true
}
```

**Response Types:**
- `filter`: Only filter function generated
- `render`: Only render function generated
- `both`: Both filter and render functions generated
- `json`: JSON response
- `unknown`: Could not determine response type

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing required parameters
- `404 Not Found`: LLM configuration not found
- `500 Internal Server Error`: Conversion failed

### 6. Get Filter Generation Prompt

Returns the prompt that would be sent to the LLM for filter generation, useful for debugging and understanding the conversion process.

**Endpoint:** `POST /api/llm/get-prompt`

**Request Body:**
```json
{
  "llmConfiguration": "gpt-4",
  "query": "Show me high priority items",
  "sampleData": {
    "priority": "high",
    "status": "open"
  }
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "You are a code generation assistant. Generate a JavaScript filter function...\n\nQuery: Show me high priority items\n\nSample data structure:\n{\"priority\":\"high\",\"status\":\"open\"}\n\n..."
}
```

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Missing required parameters
- `404 Not Found`: LLM configuration not found
- `500 Internal Server Error`: Prompt generation failed

## Configuration

### LLM Configuration File

The LLM configuration is stored as a YAML file in the GitHub registry and accessed via the `LLM_CONFIG_ASSET_KEY`. The YAML structure is:

```yaml
configurations:
  
  # OpenAI Configuration
  - name: gpt-4
    provider: openai
    model: gpt-4
    description: "OpenAI GPT-4 - Most capable model for complex tasks"
    temperature: 0.7
    maxTokens: 5000
    enabled: true

  - name: gpt-3.5-turbo
    provider: openai
    model: gpt-3.5-turbo
    description: "OpenAI GPT-3.5 Turbo - Fast and efficient for most tasks"
    temperature: 0.7
    maxTokens: 1000
    enabled: true
```

### YAML to API Response Transformation

When the API retrieves this YAML configuration, it performs the following transformations:

1. **Configuration Validation**: Each configuration is validated to ensure:
   - Required fields (name, provider, model) are present
   - Corresponding API keys exist in environment variables
   - The provider is supported

2. **Default Configuration**: The first enabled configuration becomes the default if not explicitly specified

3. **Response Structure**: The YAML is transformed into the API response format:
   ```json
   {
     "configurations": [...],  // Array of configuration objects
     "defaultConfiguration": "gpt-3.5-turbo"  // Name of default config
   }
   ```

4. **Model Initialization**: For each valid configuration, the appropriate model client is initialized and cached

### Environment Variables

- `LLM_CONFIG_ASSET_KEY`: **Required** - The asset key that identifies the YAML configuration file in the GitHub registry
- `CONFIG_GITHUB_REPO`: GitHub repository for asset loading (format: `owner/repo`)
- `CONFIG_GITHUB_TOKEN`: GitHub token for accessing private repositories
- `CONFIG_GITHUB_BRANCH`: GitHub repository branch used for assets and configuration data

### Provider-Specific Environment Variables

Each LLM provider requires specific API keys:

- **OpenAI**: `OPENAI_API_KEY`
- **Anthropic**: `ANTHROPIC_API_KEY`
- **Google**: `GOOGLE_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
- **Azure OpenAI**: `AZURE_OPENAI_API_KEY`
- **LiteLLM**: Provider-specific keys based on the model
- **Ollama**: No API key required (local models)

### Additional Configuration Options

- `CONFIG_VERBOSE`: Enable verbose logging for configuration loading
- `LLM_DEFAULT_TEMPERATURE`: Override default temperature for all models
- `LLM_DEFAULT_MAX_TOKENS`: Override default max tokens for all models

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE",
    "details": {
      // Additional error context
    }
  }
}
```

Common error codes:
- `CONFIGURATION_NOT_FOUND`: The specified LLM configuration does not exist
- `INVALID_PARAMETERS`: Request parameters are invalid or missing
- `API_KEY_MISSING`: Required API key not found in environment variables
- `PROVIDER_ERROR`: LLM provider returned an error
- `CONFIGURATION_ERROR`: Configuration file is invalid or missing
- `INTERNAL_ERROR`: Unexpected server error

## Supported Providers

### 1. OpenAI
- Models: GPT-4, GPT-3.5-Turbo, and other OpenAI models
- Features: Function calling, streaming, embeddings
- Configuration: Requires `OPENAI_API_KEY`

### 2. Anthropic
- Models: Claude 3 series (Opus, Sonnet, Haiku)
- Features: Large context windows, constitutional AI
- Configuration: Requires `ANTHROPIC_API_KEY`

### 3. Google (Gemini)
- Models: Gemini Pro, Gemini Pro Vision
- Features: Multimodal capabilities
- Configuration: Requires `GOOGLE_API_KEY`

### 4. Azure OpenAI
- Models: Azure-hosted OpenAI models
- Features: Enterprise security, SLA guarantees
- Configuration: Requires `AZURE_OPENAI_API_KEY` and endpoint configuration

### 5. LiteLLM
- Models: Proxy for various providers
- Features: Unified interface for multiple providers
- Configuration: Provider-specific API keys

### 6. Ollama
- Models: Local LLM models (Llama 2, Mistral, etc.)
- Features: Privacy-focused, no API keys required
- Configuration: Requires Ollama service running locally

## Performance Considerations

1. **Model Caching**: LLM clients are cached after initialization to avoid repeated setup overhead
2. **Configuration Caching**: Configurations are cached in memory with periodic refresh
3. **Response Streaming**: Large responses can be streamed (provider-dependent)
4. **Rate Limiting**: Respect provider-specific rate limits
5. **Timeout Handling**: Long-running requests have configurable timeouts

## Security Considerations

1. **API Key Management**: Never expose API keys in responses or logs
2. **Input Validation**: All inputs are validated to prevent injection attacks
3. **Prompt Sanitization**: User inputs are sanitized before sending to LLMs
4. **Error Messages**: Sensitive information is never exposed in error messages
5. **HTTPS Only**: All API communications should use HTTPS in production

## Monitoring and Logging

The API includes comprehensive logging for:
- Configuration loading and validation
- LLM request/response tracking
- Error conditions and retry attempts
- Performance metrics (response times)
- Token usage tracking

Logs are structured in JSON format for easy parsing and analysis.