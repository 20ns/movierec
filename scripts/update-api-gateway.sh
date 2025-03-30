#!/bin/bash

# Add binary media types to API Gateway
aws apigateway update-rest-api \
  --rest-api-id n09230hhhj \
  --patch-operations op=replace,path=/binaryMediaTypes/*~1*,value='*/*' \
  --region eu-north-1

# Deploy API to apply changes
aws apigateway create-deployment \
  --rest-api-id n09230hhhj \
  --stage-name prod \
  --region eu-north-1
