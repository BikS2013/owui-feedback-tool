#!/bin/bash

# Test script for Docker runtime configuration
# This script helps debug the runtime configuration issue

echo "=== Docker Runtime Configuration Test ==="
echo ""

# Function to test the config endpoint
test_config_endpoint() {
    local url=$1
    echo "Testing config endpoint at: $url"
    
    # Use curl with verbose output
    response=$(curl -s -w "\n\nHTTP_CODE:%{http_code}\n" "$url" 2>&1)
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "HTTP Status: $http_code"
    echo "Response Body:"
    echo "$body"
    echo ""
    
    # Try to parse as JSON if successful
    if [ "$http_code" = "200" ]; then
        echo "Parsed JSON (if valid):"
        echo "$body" | jq . 2>/dev/null || echo "(Invalid JSON)"
    fi
    echo "---"
}

# Check if container is running
echo "1. Checking if container is running..."
container_id=$(docker ps -q -f "ancestor=owui-feedback-ui" | head -1)

if [ -z "$container_id" ]; then
    echo "ERROR: No container found running owui-feedback-ui image"
    echo "Please start the container with:"
    echo "  docker run -e API_URL=http://your-api-url -p 8080:80 owui-feedback-ui"
    exit 1
fi

echo "Found container: $container_id"
echo ""

# Check environment variable in container
echo "2. Checking API_URL environment variable in container..."
api_url=$(docker exec "$container_id" printenv API_URL)
echo "API_URL in container: ${api_url:-<not set>}"
echo ""

# Check nginx configuration
echo "3. Checking nginx configuration..."
echo "Contents of /etc/nginx/conf.d/default.conf:"
docker exec "$container_id" cat /etc/nginx/conf.d/default.conf | grep -A5 -B5 "config.json" || echo "config.json location not found"
echo ""

# Test the config endpoint from outside
echo "4. Testing /config.json endpoint from host..."
test_config_endpoint "http://localhost:8080/config.json"

# Test from inside the container
echo "5. Testing /config.json endpoint from inside container..."
docker exec "$container_id" sh -c 'curl -s http://localhost/config.json' || echo "Failed to test from inside container"
echo ""

# Check nginx logs
echo "6. Recent nginx access logs:"
docker exec "$container_id" tail -n 20 /var/log/nginx/access.log 2>/dev/null || echo "No access logs found"
echo ""

echo "7. Recent nginx error logs:"
docker exec "$container_id" tail -n 20 /var/log/nginx/error.log 2>/dev/null || echo "No error logs found"
echo ""

# Additional debugging info
echo "8. Container port mapping:"
docker port "$container_id"
echo ""

echo "=== Test Complete ==="
echo ""
echo "Troubleshooting tips:"
echo "- Ensure the container was started with -e API_URL=<your-url>"
echo "- Check that port mapping is correct (e.g., -p 8080:80)"
echo "- Verify nginx is running inside the container"
echo "- Check browser console for any CORS or network errors"