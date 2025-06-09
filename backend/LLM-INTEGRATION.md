# LLM Integration

## Overview

The LLM (Large Language Model) integration allows users to execute prompts stored in GitHub against conversations using configurable LLM backends. This feature enables automated analysis, summarization, and processing of conversation data.

## Architecture

### Request Flow

1. **Frontend** → User clicks the sparkles (✨) button in conversation detail
2. **Frontend** → Sends request with LLM config, prompt path, and conversation to backend
3. **Backend** → Validates request and generates tracking ID
4. **Backend** → Returns acknowledgment with request ID
5. **Future** → Backend will fetch prompt from GitHub, process with LLM, and return results

### Components

#### Backend

- **Types**: `/backend/src/types/llm.types.ts`
  - `LLMPromptExecutionRequest`
  - `LLMPromptExecutionResponse`
  - `LLMPromptExecutionStatus`

- **Routes**: `/backend/src/routes/llm.routes.ts`
  - `POST /api/llm/execute-prompt`
  - `GET /api/llm/status/:requestId`

#### Frontend

- **Service**: `/src/services/llm.service.ts`
  - `executePrompt()` - Sends execution request
  - `getExecutionStatus()` - Checks execution status

- **UI**: `/src/components/ConversationDetail/ConversationDetail.tsx`
  - LLM execution button with sparkles icon
  - Handler function for prompt execution

## API Reference

### Execute Prompt

```http
POST /api/llm/execute-prompt
Content-Type: application/json

{
  "llmConfiguration": "gpt-4",
  "promptFilePath": "prompts/analysis/conversation-summary.md",
  "conversation": {
    "id": "conv-123",
    "title": "Example Conversation",
    "createdAt": "2025-06-09T00:00:00Z",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-06-09T00:00:00Z"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help you?",
        "timestamp": "2025-06-09T00:00:01Z"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Prompt execution request accepted",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Check Status

```http
GET /api/llm/status/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "createdAt": "2025-06-09T00:00:00Z",
  "updatedAt": "2025-06-09T00:00:00Z"
}
```

### List Configurations

```http
GET /api/llm/configurations
```

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
      "name": "claude-3-opus",
      "provider": "anthropic",
      "model": "claude-3-opus-20240229",
      "description": "Claude 3 Opus - Most capable Claude model",
      "enabled": true
    }
  ],
  "defaultConfiguration": "gpt-3.5-turbo"
}
```

### Test Configuration

```http
POST /api/llm/test
Content-Type: application/json

{
  "configurationName": "gpt-3.5-turbo",
  "prompt": "Tell me a joke about programming"
}
```

**Response:**
```json
{
  "success": true,
  "configuration": "gpt-3.5-turbo",
  "response": "Why do programmers prefer dark mode? Because light attracts bugs!",
  "duration": 1234
}
```

### Reload Configurations

```http
POST /api/llm/reload
```

**Response:**
```json
{
  "success": true,
  "message": "Configurations reloaded successfully",
  "configurationsLoaded": 5
}
```

## Configuration

### LLM Configuration System

LLM configurations are managed through a YAML file (`llm-config.yaml`) that defines available models, providers, and their settings.

#### Configuration File Structure

```yaml
configurations:
  - name: gpt-4
    provider: openai
    model: gpt-4
    description: "OpenAI GPT-4 - Most capable model for complex tasks"
    temperature: 0.7
    maxTokens: 2000
    enabled: true

defaultConfiguration: gpt-3.5-turbo
```

#### Supported Providers

1. **OpenAI** (`openai`)
   - Models: gpt-4, gpt-3.5-turbo, etc.
   - Requires: `OPENAI_API_KEY` environment variable
   - Configuration: temperature, maxTokens, baseURL (optional)

2. **Anthropic** (`anthropic`)
   - Models: claude-3-opus, claude-3-sonnet, etc.
   - Requires: `ANTHROPIC_API_KEY` environment variable
   - Configuration: temperature, maxTokens

3. **Google** (`google`)
   - Models: gemini-pro, gemini-pro-vision
   - Requires: `GOOGLE_API_KEY` environment variable
   - Configuration: temperature, maxOutputTokens

4. **Azure OpenAI** (`azure-openai`)
   - Models: Depends on deployment
   - Requires: `AZURE_OPENAI_API_KEY` environment variable
   - Configuration: apiVersion, azureOpenAIEndpoint, azureOpenAIApiDeploymentName
   - Endpoint format: `https://your-resource.openai.azure.com`

5. **LiteLLM** (`litellm`)
   - Models: Any model supported by LiteLLM proxy
   - Configuration: apiBase, apiKey (optional), temperature, maxTokens

6. **Ollama** (`ollama`)
   - Models: llama2, mistral, codellama, etc.
   - Configuration: baseUrl (default: http://localhost:11434), temperature, numPredict

#### Setup Instructions

1. Copy the example configuration:
   ```bash
   cp llm-config.example.yaml llm-config.yaml
   ```

2. Edit `llm-config.yaml` to:
   - Enable/disable configurations
   - Adjust model parameters
   - Set the default configuration

3. Set required environment variables:
   ```bash
   export OPENAI_API_KEY=your-key-here
   export ANTHROPIC_API_KEY=your-key-here
   export GOOGLE_API_KEY=your-key-here
   ```

### Prompt File Paths

Prompts are stored in the GitHub repository. The `promptFilePath` parameter specifies the location:
- `"prompts/analysis/conversation-summary.md"`
- `"prompts/analysis/sentiment-analysis.md"`
- `"prompts/qa/quality-assessment.md"`

## Usage

### From the UI

1. Navigate to a conversation in the feedback viewer
2. Click the sparkles button (✨) in the header
3. The system will execute the default prompt with the default LLM configuration
4. An alert will show the request ID for tracking

### Programmatically

```typescript
import { llmService } from './services/llm.service';

// Execute a prompt
const response = await llmService.executePrompt(
  'gpt-4',
  'prompts/analysis/summary.md',
  conversation
);

// Check status
const status = await llmService.getExecutionStatus(response.requestId);
```

## Future Enhancements

### Phase 1: GitHub Integration
- Fetch prompt files from GitHub repository
- Cache prompts for performance
- Support prompt templates with variables

### Phase 2: LLM Backend Integration
- Configure multiple LLM providers (OpenAI, Anthropic, etc.)
- Support for local LLMs (Ollama, llama.cpp)
- Model selection per request

### Phase 3: Advanced Features
- Streaming responses
- Batch processing multiple conversations
- Custom prompt editor in UI
- Result storage and retrieval
- Webhook notifications on completion

### Phase 4: UI Improvements
- Prompt selection dropdown
- LLM configuration selector
- Real-time status updates
- Results viewer with formatting

## Security Considerations

1. **API Keys**: LLM API keys should be stored securely in environment variables
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Input Validation**: Validate prompt paths to prevent directory traversal
4. **Output Sanitization**: Sanitize LLM outputs before displaying to users
5. **Access Control**: Consider adding authentication for LLM endpoints

## Error Handling

The system handles various error scenarios:

- **Invalid Request**: Returns 400 with specific error message
- **Missing Configuration**: Returns 503 if LLM not configured
- **GitHub Errors**: Will handle file not found, access denied
- **LLM Errors**: Will handle API errors, timeouts, rate limits

## Monitoring

Recommended metrics to track:
- Request count by LLM configuration
- Average execution time
- Error rate by type
- Token usage per request
- Cost per request (for paid APIs)