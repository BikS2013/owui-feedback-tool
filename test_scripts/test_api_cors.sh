#!/bin/bash

echo "=== Testing Backend API and CORS Configuration ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:3120"
FRONTEND_URL="http://localhost:3121"

echo "Testing Backend at: $BACKEND_URL"
echo "Testing Frontend at: $FRONTEND_URL"
echo ""

# Test 1: Direct backend health check
echo "1. Testing backend health endpoint (no CORS needed):"
curl -s -X GET "$BACKEND_URL/health" | jq . || echo -e "${RED}Failed to connect to backend${NC}"
echo ""

# Test 2: Backend CORS configuration endpoint
echo "2. Testing backend CORS configuration:"
curl -s -X GET "$BACKEND_URL/api/debug/cors" | jq . || echo -e "${RED}Failed to get CORS config${NC}"
echo ""

# Test 3: Backend configuration endpoint with Origin header
echo "3. Testing /api/configuration with Origin header from frontend:"
curl -s -X GET "$BACKEND_URL/api/configuration" \
  -H "Origin: $FRONTEND_URL" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|error|Error)"
echo ""

# Test 4: OPTIONS preflight request
echo "4. Testing OPTIONS preflight request:"
curl -s -X OPTIONS "$BACKEND_URL/api/configuration" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control)"
echo ""

# Test 5: Frontend config.json
echo "5. Testing frontend config.json:"
curl -s -X GET "$FRONTEND_URL/config.json" | jq . || echo -e "${RED}Failed to get frontend config${NC}"
echo ""

# Test 6: Frontend proxy to backend
echo "6. Testing frontend proxy to backend API:"
curl -s -X GET "$FRONTEND_URL/api/configuration" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -E "(< HTTP|error|Error)" | head -20
echo ""

# Test 7: Check if backend is actually running
echo "7. Checking if backend container is running:"
docker ps | grep owui-backend || echo -e "${RED}Backend container not found${NC}"
echo ""

# Test 8: Check backend logs for CORS errors
echo "8. Recent backend logs (checking for CORS issues):"
docker logs owui-backend --tail 20 2>&1 | grep -E "(CORS|cors|Origin)" || echo "No CORS-related logs found"
echo ""

echo "=== Test Summary ==="
echo "If you see 502 Bad Gateway errors, the frontend nginx cannot reach the backend."
echo "If you see CORS errors, the backend is rejecting requests from the frontend origin."
echo "If you see pending requests in browser, it's likely a CORS preflight issue."