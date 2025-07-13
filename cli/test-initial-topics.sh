#!/bin/bash

# Test script for initial topics feature

echo "Building the CLI..."
npm run build

echo -e "\n=== Testing initial topics feature ==="

# Create a small test questions file
cat > test-questions.json << 'EOF'
{
  "questions": [
    {
      "conversationId": "thread-001",
      "conversationTimestamp": "2024-01-15T10:00:00Z",
      "questionOrder": 1,
      "totalQuestionsInThread": 2,
      "questionText": "How do I reset my password?"
    },
    {
      "conversationId": "thread-001",
      "conversationTimestamp": "2024-01-15T10:00:00Z",
      "questionOrder": 2,
      "totalQuestionsInThread": 2,
      "questionText": "Can I use two-factor authentication?"
    },
    {
      "conversationId": "thread-002",
      "conversationTimestamp": "2024-01-15T11:00:00Z",
      "questionOrder": 1,
      "totalQuestionsInThread": 1,
      "questionText": "I want to suggest a new feature for batch processing"
    },
    {
      "conversationId": "thread-003",
      "conversationTimestamp": "2024-01-15T12:00:00Z",
      "questionOrder": 1,
      "totalQuestionsInThread": 2,
      "questionText": "My API calls are failing with 500 errors"
    },
    {
      "conversationId": "thread-003",
      "conversationTimestamp": "2024-01-15T12:00:00Z",
      "questionOrder": 2,
      "totalQuestionsInThread": 2,
      "questionText": "How can I debug the API response?"
    }
  ],
  "metadata": {
    "totalThreads": 3,
    "totalQuestions": 5,
    "extractedAt": "2024-01-15T14:00:00Z"
  }
}
EOF

echo -e "\n=== Running topic identification with initial topics ==="
echo "Command: npm run cli identify_topics -- -i test-questions.json -o test-topics-output.json -l openai -t sample-initial-topics.json"

# Note: This will only work if OPENAI_API_KEY is set in backend .env
# For testing purposes, you might want to use a mock LLM or ensure the key is available

echo -e "\n=== Test files created ==="
echo "- test-questions.json: Sample questions for testing"
echo "- sample-initial-topics.json: Initial topics with descriptions"
echo ""
echo "To run the test (requires valid LLM API key in backend):"
echo "npm run cli identify_topics -- -i test-questions.json -o test-topics-output.json -l openai -t sample-initial-topics.json"