const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const axios = require('axios');
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { 
  extractOrigin, 
  createCorsPreflightResponse, 
  createCorsErrorResponse, 
  createCorsSuccessResponse 
} = require("./cors-utils");

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

// Initialize DynamoDB with retry configuration
const client = new DynamoDBClient({
    maxAttempts: 3,
    retryMode: 'standard'
});
const dynamoDB = DynamoDBDocumentClient.from(client);

// Create axios instance with timeout
const axiosInstance = axios.create({
    timeout: 20000 // 20 second timeout for API calls
});

// Simple rate limiter for API calls
const rateLimiter = {
    queue: [],
    running: 0,
    maxConcurrent: 3,
    
    async add(fn) {
        return new Promise((resolve) => {
            const run = async () => {
                this.running++;
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    resolve(null);
                } finally {
                    this.running--;
                    this.processQueue();
                }
            };
            
            if (this.running < this.maxConcurrent) {
                run();
            } else {
                this.queue.push(run);
            }
        });
    },
    
    processQueue() {
        if (this.queue.length > 0 && this.running < this.maxConcurrent) {
            const next = this.queue.shift();
            next();
        }
    }
};

exports.handler = async (event) => {
  const requestOrigin = extractOrigin(event);

  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsPreflightResponse(requestOrigin);
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createCorsErrorResponse(401, "Unauthorized", requestOrigin);
    }

    const token = authHeader.substring(7);
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      try {
        payload = await verifier.verify(token);
      } catch (error) {
        console.error("Token verification failed:", error);
        return createCorsErrorResponse(401, "Unauthorized", requestOrigin);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      try {
        // Get user preferences for personalization
        const preferencesCommand = new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId: userId }
        });

        const preferencesResult = await dynamoDB.send(preferencesCommand);
        const userPreferences = preferencesResult.Item || {};

        // For now, return a simple response - you can enhance this with actual recommendation logic
        const recommendations = {
          recommendations: [],
          message: "Personalized recommendations feature coming soon",
          userPreferences: userPreferences
        };

        return createCorsSuccessResponse(recommendations, requestOrigin);
      } catch (error) {
        console.error("Error getting recommendations:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
      }
    } else {
      return createCorsErrorResponse(405, "Method not allowed", requestOrigin);
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return createCorsErrorResponse(500, "Internal server error", requestOrigin);
  }
};