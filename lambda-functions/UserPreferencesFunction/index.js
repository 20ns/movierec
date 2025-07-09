const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { createApiResponse } = require("./shared/response");

// Configure DynamoDB client for production (always use cloud DynamoDB)
const dynamoDbClientConfig = {};
// We always use cloud DynamoDB for this demo - no local DynamoDB setup needed

const client = new DynamoDBClient(dynamoDbClientConfig);
const docClient = DynamoDBDocumentClient.from(client);

let verifier;
try {
  verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.USER_POOL_ID,
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID,
  });
} catch (error) {
  console.error("Failed to create Cognito JWT verifier:", error);
}

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  if (!process.env.USER_PREFERENCES_TABLE) {
    console.error("USER_PREFERENCES_TABLE environment variable is not set");
    return createApiResponse(500, { error: "Server configuration error" }, event);
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createApiResponse(401, { error: "Unauthorized" }, event);
    }

    const token = authHeader.substring(7);
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      if (!verifier) {
        console.error("JWT verifier not available");
        return createApiResponse(500, { error: "JWT verifier configuration error" }, event);
      }
      try {
        payload = await verifier.verify(token);
      } catch (error) {
        console.error("Token verification failed:", error);
        return createApiResponse(401, { error: "Unauthorized" }, event);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      // Get user preferences
      try {
        const command = new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId: userId }
        });

        const result = await docClient.send(command);
        
        const preferences = result.Item || {
          userId: userId,
          genres: [],
          keywords: [],
          minRating: 0,
          maxRating: 10,
          releaseYearStart: 1900,
          releaseYearEnd: new Date().getFullYear()
        };

        return createApiResponse(200, { preferences }, event);
      } catch (error) {
        console.error("Error getting preferences:", error);
        return createApiResponse(500, { error: "Internal server error" }, event);
      }
    } else if (event.httpMethod === 'POST') {
      // Update user preferences
      try {
        const preferences = JSON.parse(event.body || '{}');
        
        const command = new PutCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Item: {
            userId: userId,
            ...preferences,
            updatedAt: new Date().toISOString()
          }
        });

        await docClient.send(command);
        
        return createApiResponse(200, { message: "Preferences updated successfully" }, event);
      } catch (error) {
        console.error("Error updating preferences:", error);
        return createApiResponse(500, { error: "Internal server error" }, event);
      }
    } else {
      return createApiResponse(405, { error: "Method not allowed" }, event);
    }
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN USER PREFERENCES FUNCTION ===", error);
    return createApiResponse(500, { error: "Internal server error", details: error.message }, event);
  }
};
