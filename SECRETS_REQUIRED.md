# Required GitHub Secrets for CI/CD

This document lists the GitHub secrets that need to be configured for the CI/CD pipeline to work properly.

## Repository Secrets to Configure

Go to: `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

### Required Secrets:

1. **REACT_APP_TMDB_API_KEY**
   - Value: `b484a8d608caf759d5d575db3ec03bbc`
   - Description: The Movie Database API key for fetching movie data

2. **REACT_APP_FANART_TV_API_KEY**
   - Value: `13d32ba2dfea8c56157d611604861db5`
   - Description: FanArt.tv API key for movie artwork

3. **REACT_APP_API_GATEWAY_INVOKE_URL**
   - Value: `https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod`
   - Description: AWS API Gateway endpoint URL

4. **ALLOWED_CORS_ORIGINS**
   - Value: `https://www.movierec.net,https://movierec.net,http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000`
   - Description: Comma-separated list of allowed CORS origins

### AWS Secrets (if not already configured):

5. **AWS_ACCESS_KEY_ID**
   - Description: AWS access key for CDK deployment

6. **AWS_SECRET_ACCESS_KEY**
   - Description: AWS secret access key for CDK deployment

## After Configuration

Once all secrets are configured, the CI/CD pipeline should be able to:
- Build the React application with proper environment variables
- Validate CDK infrastructure with required API keys
- Run integration tests against the API endpoints

Delete this file after configuring the secrets.