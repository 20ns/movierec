#!/bin/bash

# API Gateway ID
API_ID="n09230hhhj"
REGION="eu-north-1"
RESOURCE_ID="qisgid" # Your resource ID for /preferences
STAGE_NAME="prod"

# Your frontend origin
ORIGIN="https://account.d1akezqpdr5wgr.amplifyapp.com"

echo "Enabling CORS for API Gateway resource..."

# Step 1: Enable CORS for OPTIONS method
echo "Configuring OPTIONS method..."

# First, create or update the OPTIONS method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION

# Set up method response for OPTIONS
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "{
    \"method.response.header.Access-Control-Allow-Headers\":true,
    \"method.response.header.Access-Control-Allow-Methods\":true,
    \"method.response.header.Access-Control-Allow-Origin\":true,
    \"method.response.header.Access-Control-Allow-Credentials\":true
  }" \
  --region $REGION

# Set up integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates "{\"application/json\":\"{\\\"statusCode\\\": 200}\"}" \
  --region $REGION

# Set up integration response for OPTIONS
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "{
    \"method.response.header.Access-Control-Allow-Headers\":\"'Authorization,Content-Type,X-Amz-Date'\"
    \"method.response.header.Access-Control-Allow-Methods\":\"'GET,POST,OPTIONS'\"
    \"method.response.header.Access-Control-Allow-Origin\":\"'$ORIGIN'\"
    \"method.response.header.Access-Control-Allow-Credentials\":\"'true'\"
  }" \
  --region $REGION

# Step 2: Update GET method response to include CORS headers
echo "Configuring CORS headers for GET method..."
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --status-code 200 \
  --response-parameters "{
    \"method.response.header.Access-Control-Allow-Origin\":true,
    \"method.response.header.Access-Control-Allow-Credentials\":true
  }" \
  --region $REGION

# Step 3: Update POST method response to include CORS headers
echo "Configuring CORS headers for POST method..."
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters "{
    \"method.response.header.Access-Control-Allow-Origin\":true,
    \"method.response.header.Access-Control-Allow-Credentials\":true
  }" \
  --region $REGION

# Deploy the API to make changes effective
echo "Deploying API..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE_NAME \
  --region $REGION

echo "CORS configuration completed!"
