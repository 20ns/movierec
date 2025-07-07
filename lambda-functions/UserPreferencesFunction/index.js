const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { 
  extractOrigin, 
  createCorsPreflightResponse, 
  createCorsErrorResponse, 
  createCorsSuccessResponse 
} = require("./shared/cors-utils");

// Configure DynamoDB client for production (always use cloud DynamoDB)
const dynamoDbClientConfig = {};
// We always use cloud DynamoDB for this demo - no local DynamoDB setup needed

const client = new DynamoDBClient(dynamoDbClientConfig);
const docClient = DynamoDBDocumentClient.from(client);

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

exports.handler = async (event) => {
  const requestOrigin = extractOrigin(event);

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

        return createCorsSuccessResponse({ preferences }, requestOrigin);
      } catch (error) {
        console.error("Error getting preferences:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
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
        
        return createCorsSuccessResponse({ message: "Preferences updated successfully" }, requestOrigin);
      } catch (error) {
        console.error("Error updating preferences:", error);
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
