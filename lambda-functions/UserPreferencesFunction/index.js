const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { createApiResponse } = require("/opt/nodejs/shared/response");

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

  // Handle CORS preflight OPTIONS method
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
    if (!authHeader) {
      console.error('No authorization header provided');
      return createApiResponse(401, { error: "Authorization header required" }, event);
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid authorization header format:', authHeader.substring(0, 20));
      return createApiResponse(401, { error: "Authorization header must start with 'Bearer '" }, event);
    }

    const token = authHeader.substring(7);
    console.log('Token received - length:', token.length, 'starts with:', token.substring(0, 20) + '...');
    
    // Validate token format before processing
    if (!token || token.trim() === '') {
      console.error('Empty token after Bearer prefix');
      return createApiResponse(401, { error: "Token is empty" }, event);
    }
    
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid token format: expected 3 parts, got', tokenParts.length, 'token:', token.substring(0, 50));
      return createApiResponse(401, { 
        error: "Invalid JWT token format",
        details: `Expected 3 parts separated by dots, got ${tokenParts.length} parts`
      }, event);
    }
    
    let payload;
    
    if (process.env.IS_OFFLINE === 'true') {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
      if (!verifier) {
        console.error("JWT verifier not available - check environment variables");
        return createApiResponse(500, { error: "Authentication service not configured" }, event);
      }
      
      try {
        payload = await verifier.verify(token);
        console.log('Token verified successfully for user:', payload.sub);
      } catch (error) { // JWT token verification error
        console.error("Token verification error:", error);
        console.error("Token verification failed:", {
          errorMessage: error.message,
          errorName: error.name,
          tokenLength: token.length,
          tokenStart: token.substring(0, 20),
          tokenParts: tokenParts.length,
          userPoolId: process.env.USER_POOL_ID,
          clientId: process.env.COGNITO_CLIENT_ID
        });
        
        // Return proper 401 error instead of letting it crash
        return createApiResponse(401, { 
          error: "Authentication failed",
          details: "Invalid or expired token"
        }, event);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      // Get user preferences
      try {
        console.log('Getting preferences for user:', userId);
        const command = new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId: userId }
        });

        const result = await docClient.send(command);
        
        if (result.Item) {
          console.log('Preferences found for user:', userId);
          return createApiResponse(200, { preferences: result.Item }, event);
        } else {
          console.log('No preferences found for user:', userId);
          return createApiResponse(404, { error: "No preferences found" }, event);
        }
      } catch (error) {
        console.error("Error getting preferences:", error);
        return createApiResponse(500, { error: "Internal server error", details: error.message }, event);
      }
    } else if (event.httpMethod === 'POST') {
      // Update user preferences
      try {
        console.log('Updating preferences for user:', userId);
        let preferences;
        try {
          preferences = JSON.parse(event.body || '{}');
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          return createApiResponse(400, { error: "Invalid JSON in request body" }, event);
        }
        
        // Log the preferences being saved (without sensitive data)
        console.log('Preferences to save:', {
          userId: userId,
          questionnaireCompleted: preferences.questionnaireCompleted,
          favoriteGenres: preferences.favoriteGenres?.length || 0,
          hasData: Object.keys(preferences).length > 0
        });
        
        const command = new PutCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Item: {
            userId: userId,
            ...preferences,
            updatedAt: new Date().toISOString()
          }
        });

        await docClient.send(command);
        
        console.log('Preferences saved successfully for user:', userId);
        return createApiResponse(200, { 
          message: "Preferences updated successfully",
          userId: userId,
          timestamp: new Date().toISOString()
        }, event);
      } catch (error) {
        console.error("Error updating preferences:", error);
        return createApiResponse(500, { error: "Internal server error", details: error.message }, event);
      }
    } else {
      return createApiResponse(405, { error: "Method not allowed" }, event);
    }
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN USER PREFERENCES FUNCTION ===", error);
    return createApiResponse(500, { error: "Internal server error", details: error.message }, event);
  }
};
