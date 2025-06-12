#!/bin/bash

# Test script for the retrieved_docs query parameter functionality

echo "Testing retrieved_docs query parameter..."
echo "========================================"

# Base URL - adjust if needed
BASE_URL="http://localhost:3001/api"

# Test 1: Without include_retrieved_docs parameter (should remove retrieved_docs)
echo -e "\nTest 1: Default behavior (retrieved_docs should be removed)"
curl -s "${BASE_URL}/agent/threads?agentName=Customer%20Facing&limit=1" | jq '.data.threads[0].values | has("retrieved_docs")'

# Test 2: With include_retrieved_docs=false (should remove retrieved_docs)
echo -e "\nTest 2: include_retrieved_docs=false (retrieved_docs should be removed)"
curl -s "${BASE_URL}/agent/threads?agentName=Customer%20Facing&limit=1&include_retrieved_docs=false" | jq '.data.threads[0].values | has("retrieved_docs")'

# Test 3: With include_retrieved_docs=true (should keep retrieved_docs)
echo -e "\nTest 3: include_retrieved_docs=true (retrieved_docs should be kept)"
curl -s "${BASE_URL}/agent/threads?agentName=Customer%20Facing&limit=1&include_retrieved_docs=true" | jq '.data.threads[0].values | has("retrieved_docs")'

echo -e "\n========================================"
echo "Tests completed!"