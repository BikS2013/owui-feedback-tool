# Azure Web App Deployment Instructions

## Environment Variable Configuration Issue

When deploying the Docker container to Azure Web Apps, the `API_BASE_URL` environment variable might not be properly substituted in the nginx configuration, resulting in `/config.json` returning the default `http://localhost:3001` instead of your configured value.

## Solution

The Dockerfile has been updated with a more robust environment variable handling mechanism:

1. **docker-entrypoint.sh**: A custom entrypoint script that:
   - Logs the current `API_BASE_URL` value for debugging
   - Uses `envsubst` to substitute the environment variable in the nginx template
   - Shows the generated configuration for verification
   - Starts nginx

2. **Improved CMD**: Uses shell form to ensure proper environment variable expansion

## Deployment Steps

1. **Build and push the Docker image**:
   ```bash
   docker build -t your-registry.azurecr.io/owui-feedback-ui:latest .
   docker push your-registry.azurecr.io/owui-feedback-ui:latest
   ```

2. **Configure Azure Web App**:
   - In the Azure Portal, go to your Web App
   - Navigate to Configuration > Application settings
   - Ensure `API_BASE_URL` is set to your backend URL (e.g., `https://biks-owui-feedback-api-g8eqb6dfeuajgsq3.westeurope-01.azurewebsites.net`)
   - Save the configuration

3. **Optional: Set Startup Command**:
   If the environment variable still doesn't work, you can set a custom startup command in Azure:
   - Go to Configuration > General settings
   - In "Startup Command", enter: `/bin/sh -c "export API_BASE_URL='${API_BASE_URL}' && /docker-entrypoint.sh"`

4. **Verify Deployment**:
   - After deployment, check the logs in Azure Portal under "Log stream"
   - You should see: "Starting nginx with API_BASE_URL: [your-configured-url]"
   - Visit `https://your-app.azurewebsites.net/config.json` to verify it returns the correct API URL

## Troubleshooting

If the environment variable is still not working:

1. **Check Container Logs**:
   - Go to "Log stream" in Azure Portal
   - Look for the "Starting nginx with API_BASE_URL:" message
   - Verify the "Generated nginx configuration:" output

2. **Alternative Approach**:
   If Azure Web Apps continues to have issues with environment variables, you can:
   - Build the image with the API URL hardcoded: `docker build --build-arg VITE_API_URL=https://your-api-url.com .`
   - Or use Azure's App Service Editor to manually edit files after deployment

3. **Use azure-startup.sh**:
   Copy the `azure-startup.sh` file to your container and set it as the startup command in Azure Portal.

## Important Notes

- The frontend container needs to be able to communicate with the backend API from the client's browser
- Ensure CORS is properly configured on your backend to accept requests from your frontend domain
- The `API_BASE_URL` should be the full URL including protocol (https://)