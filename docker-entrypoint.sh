#!/bin/sh
set -e

# Debug: Print all environment variables starting with API
echo "=== Environment Variables ==="
env | grep -i api || echo "No API environment variables found"
echo "==========================="

# Debug: Print environment variable
echo "Starting nginx with API_BASE_URL: ${API_BASE_URL}"

# Replace the placeholder in the nginx template with the actual environment variable
if [ -n "${API_BASE_URL}" ]; then
    echo "Substituting API_BASE_URL in nginx configuration..."
    envsubst '${API_BASE_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
    
    # Verify substitution worked
    echo "=== Verifying substitution ==="
    if grep -q '\${API_BASE_URL}' /etc/nginx/conf.d/default.conf; then
        echo "ERROR: Environment variable substitution failed - literal \${API_BASE_URL} still present"
        echo "Attempting manual substitution..."
        sed -i "s|\${API_BASE_URL}|${API_BASE_URL}|g" /etc/nginx/conf.d/default.conf
    else
        echo "SUCCESS: Environment variable substituted correctly"
    fi
else
    echo "WARNING: API_BASE_URL not set, using default"
    cp /etc/nginx/templates/default.conf.template /etc/nginx/conf.d/default.conf
fi

# Debug: Show the generated config
echo "=== Generated nginx config.json location ==="
grep -A5 -B5 "config.json" /etc/nginx/conf.d/default.conf || true
echo "==========================================="

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'