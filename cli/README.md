# OWUI Feedback CLI

A command-line tool for extracting questions from conversation threads.

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
API_BASE_URL=http://localhost:3120
```

## Usage

### Get Threads

Retrieve complete thread data with optional checkpoints:

```bash
# Basic usage - threads only
npx tsx src/index.ts get_threads -f 2024-01-01 -t 2024-01-31 -a "Customer Facing"

# Include checkpoint data
npx tsx src/index.ts get_threads -f 2024-01-01 -t 2024-01-31 -a "Customer Facing" --include-checkpoints

# Save to file (incremental saving, page by page)
npx tsx src/index.ts get_threads -f 2024-01-01 -t 2024-01-31 -a "Customer Facing" -o threads.json
```

### Extract Questions from Threads File

Extract questions from an existing threads JSON file:

```bash
# Extract questions from threads.json
npx tsx src/index.ts extract_questions -i threads.json -o questions.json

# With debug logging
DEBUG=1 npx tsx src/index.ts extract_questions -i threads.json -o questions.json
```

### Extract Questions (from API)

Extract all user questions from conversations within a date range.

#### Date Format Support

The tool accepts various date formats:
- **Basic date**: `YYYY-MM-DD` (e.g., `2024-01-15`)
- **Date with time**: `YYYY-MM-DDTHH:mm:ss` (e.g., `2024-01-15T14:30:00`)
- **With UTC timezone**: `YYYY-MM-DDTHH:mm:ssZ` (e.g., `2024-01-15T14:30:00Z`)
- **With offset**: `YYYY-MM-DDTHH:mm:ss+HH:mm` (e.g., `2024-01-15T14:30:00+02:00`)
- **Any ISO 8601 format**

#### Examples

```bash
# Basic usage (date only)
npx tsx src/index.ts get_questions --from-date 2024-01-01 --to-date 2024-01-31

# With specific time range
npx tsx src/index.ts get_questions -f 2024-01-01T00:00:00Z -t 2024-01-31T23:59:59Z

# Filter by agent name
npx tsx src/index.ts get_questions -f 2024-01-01 -t 2024-01-31 -a "agent-name"

# Save to file
npx tsx src/index.ts get_questions -f 2024-01-01 -t 2024-01-31 -o questions.json
```

### Output Format

The tool outputs a JSON array with the following structure:

```json
[
  {
    "conversationId": "thread-123",
    "conversationTimestamp": "2024-01-15T10:30:00Z",
    "questionOrder": 1,
    "totalQuestionsInThread": 2,
    "questionText": "How do I configure the API endpoint?"
  },
  {
    "conversationId": "thread-123",
    "conversationTimestamp": "2024-01-15T10:30:00Z",
    "questionOrder": 2,
    "totalQuestionsInThread": 2,
    "questionText": "What are the authentication requirements?"
  }
]
```

## Development

```bash
# Run in development mode
npm run dev get_questions -f 2024-01-01 -t 2024-01-31

# Build for production
npm run build

# Run built version
npm start get_questions -f 2024-01-01 -t 2024-01-31
```