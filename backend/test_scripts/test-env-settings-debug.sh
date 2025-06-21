#!/bin/bash

echo "Testing Environment Settings Loading..."
echo "========================================"

# First, let's see what's configured
echo "1. Checking ENV_SETTINGS_ASSET_KEY:"
grep ENV_SETTINGS_ASSET_KEY ../.env

echo -e "\n2. Testing GitHub asset retrieval directly:"
# Get the asset key
ASSET_KEY=$(grep ENV_SETTINGS_ASSET_KEY ../.env | cut -d'=' -f2)
echo "Asset Key: $ASSET_KEY"

echo -e "\n3. Reloading environment settings:"
curl -X POST http://localhost:3001/api/debug/env/reload

echo -e "\n\n4. Checking specific environment variables:"
curl -s http://localhost:3001/api/debug/env | jq '.allEnvironmentVariables' | grep -E "(SHOW_|FEATURE_|TEST_)" || echo "No matching variables found"

echo -e "\n5. Checking total environment variables:"
BEFORE=$(curl -s http://localhost:3001/api/debug/env | jq '.summary.totalEnvVars')
echo "Total env vars: $BEFORE"

echo -e "\n6. Checking assets configuration:"
curl -s http://localhost:3001/api/debug/env | jq '.categorized.assets.ENV_SETTINGS_ASSET_KEY'