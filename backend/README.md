# OWUI Feedback Backend

Backend API service for the OWUI Feedback application, providing server-side operations like PDF generation with proper Greek character support.

## Features

- PDF generation using Puppeteer with full Unicode support
- HTML export with styled templates
- RESTful API endpoints for conversation and Q&A pair exports
- GitHub repository integration:
  - Browse repository files and directories
  - Retrieve file contents
  - Search repository code
  - View repository structure
- LLM integration with multiple providers:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude 3)
  - Google (Gemini)
  - Azure OpenAI
  - LiteLLM proxy
  - Ollama (local models)
- Proper Greek character rendering in PDFs
- Markdown processing (bold, links, headings)
- CORS support for frontend integration
- Swagger API documentation at `/api-docs`

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables:
```
PORT=3001
NODE_ENV=development

# CORS Configuration (choose one)
# Option 1: Multiple origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# Option 2: Single origin (backward compatible)
# CORS_ORIGIN=http://localhost:5173

# Option 3: Allow all origins (use with caution in production)
# CORS_ORIGINS=*

# GitHub Integration (optional)
GITHUB_REPO=owner/repository
GITHUB_TOKEN=your_github_token_here

# LLM API Keys (set as needed)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
AZURE_OPENAI_API_KEY=your_azure_key
```

3. Configure LLM providers:
```bash
cp llm-config.example.yaml llm-config.yaml
# Edit llm-config.yaml to enable/configure LLM providers
```

For detailed CORS configuration options, see [CORS-CONFIGURATION.md](./CORS-CONFIGURATION.md)

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on http://localhost:3001

The development server watches for changes in:
- All TypeScript files in the `src` directory
- The `.env` file (server will restart when environment variables change)
- JSON configuration files

Note: There's a 1-second delay before restarting to ensure file changes are complete.

## Build

Build the TypeScript code:
```bash
npm run build
```

## Production

Run the production server:
```bash
npm start
```

## API Endpoints

### API Documentation
```
GET /api-docs
```
Interactive Swagger documentation for all endpoints.

### Health Check
```
GET /health
```

### Export Endpoints

#### Export Conversation
```
POST /api/export/conversation
Content-Type: application/json

{
  "conversation": { ... },
  "qaPairs": [ ... ],
  "format": "pdf" | "html"
}
```

#### Export Q&A Pair
```
POST /api/export/qa-pair
Content-Type: application/json

{
  "qaPair": {
    "question": { ... },
    "answer": { ... },
    "rating": 8,
    "comment": "..."
  },
  "conversationId": "...",
  "format": "pdf" | "html"
}
```

### GitHub Endpoints

#### Check GitHub Status
```
GET /api/github/status
```

#### Get Repository Info
```
GET /api/github/repository
```

#### List Files
```
GET /api/github/files?path=src/components
```

#### Get Repository Tree
```
GET /api/github/tree?recursive=true
```

#### Get File Content
```
GET /api/github/file/{path}?format=raw|base64
```

#### Search Files
```
GET /api/github/search?q=test&extension=ts&path=src
```

#### Get Files by Extension
```
GET /api/github/files-by-extension/ts
```

#### Check Rate Limit
```
GET /api/github/rate-limit
```

### LLM Endpoints

#### List Configurations
```
GET /api/llm/configurations
```

#### Test Configuration
```
POST /api/llm/test
Content-Type: application/json

{
  "configurationName": "gpt-3.5-turbo",
  "prompt": "Hello!"
}
```

#### Execute Prompt
```
POST /api/llm/execute-prompt
Content-Type: application/json

{
  "llmConfiguration": "gpt-4",
  "promptFilePath": "prompts/analysis.md",
  "conversation": { ... }
}
```

#### Reload Configurations
```
POST /api/llm/reload
```

## Docker Support

You can run the backend in Docker:

```dockerfile
FROM node:18-alpine

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

## Notes

- Puppeteer is used for PDF generation to ensure proper Unicode/Greek character support
- HTML templates are styled for both screen and print media
- The service handles large conversations efficiently with streaming responses
- All exports include proper metadata and formatting