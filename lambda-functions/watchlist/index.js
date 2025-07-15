const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { createApiResponse } = require("./shared/response");

const dynamoDbClientConfig = {};
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

  if (!process.env.USER_WATCHLIST_TABLE) {
    console.error("USER_WATCHLIST_TABLE environment variable is not set");
    return createApiResponse(500, { error: "Server configuration error" }, event);
  }

  try {
    // Extract and verify JWT token with robust error handling
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

    switch (event.httpMethod) {
      case 'GET':
        try {
          const command = new QueryCommand({
            TableName: process.env.USER_WATCHLIST_TABLE,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: { ":userId": userId }
          });
          const result = await docClient.send(command);
          const items = result.Items || [];
          return createApiResponse(200, { items }, event);
        } catch (error) {
          console.error("Error getting watchlist:", error);
          return createApiResponse(500, { error: "Internal server error" }, event);
        }

      case 'POST':
        try {
          let requestBody;
          try {
            requestBody = JSON.parse(event.body || '{}');
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return createApiResponse(400, { error: "Invalid JSON in request body" }, event);
          }
          const { mediaId, movieId, title, poster_path, release_date, vote_average } = requestBody;
          const id = mediaId || movieId;

          if (!id) {
            return createApiResponse(400, { error: "Media ID is required" }, event);
          }

          const command = new PutCommand({
            TableName: process.env.USER_WATCHLIST_TABLE,
            Item: {
              userId: userId,
              mediaId: id.toString(),
              mediaType: requestBody.mediaType || requestBody.media_type || 'movie',
              title: title || '',
              posterPath: poster_path || '',
              releaseDate: release_date || '',
              voteAverage: vote_average || 0,
              addedAt: new Date().toISOString()
            }
          });
          await docClient.send(command);
          return createApiResponse(200, { message: "Added to watchlist successfully" }, event);
        } catch (error) {
          console.error("Error adding to watchlist:", error);
          return createApiResponse(500, { error: "Internal server error" }, event);
        }

      case 'DELETE':
        try {
          const mediaId = event.queryStringParameters?.mediaId;
          const movieId = event.queryStringParameters?.movieId;
          const id = mediaId || movieId;

          if (!id) {
            return createApiResponse(400, { error: "Media ID is required" }, event);
          }

          const command = new DeleteCommand({
            TableName: process.env.USER_WATCHLIST_TABLE,
            Key: { userId: userId, mediaId: id.toString() }
          });
          await docClient.send(command);
          return createApiResponse(200, { message: "Removed from watchlist successfully" }, event);
        } catch (error) {
          console.error("Error removing from watchlist:", error);
          return createApiResponse(500, { error: "Internal server error" }, event);
        }

      default:
        return createApiResponse(405, { error: "Method not allowed" }, event);
    }
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN WATCHLIST FUNCTION ===", error);
    return createApiResponse(500, { error: "Internal server error", details: error.message }, event);
  }
};

