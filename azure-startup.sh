#!/bin/sh
# Azure Web App specific startup script
# This can be set as the Startup Command in Azure Portal

# Ensure API_BASE_URL is exported
export API_BASE_URL="${API_BASE_URL}"

# Run the docker entrypoint
exec /docker-entrypoint.sh