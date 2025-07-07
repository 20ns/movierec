const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
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
  const requestOrigin = extractOrigin(event);

  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('Environment variables:', {
    USER_POOL_ID: process.env.USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    USER_WATCHLIST_TABLE: process.env.USER_WATCHLIST_TABLE
  });

  // Validate required environment variables
  if (!process.env.USER_WATCHLIST_TABLE) {
    console.error("USER_WATCHLIST_TABLE environment variable is not set");
    return createCorsErrorResponse(500, "Server configuration error", requestOrigin);
  }

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
      if (!verifier) {
        console.error("JWT verifier not available");
        return createCorsErrorResponse(500, "JWT verifier configuration error", requestOrigin);
      }
      try {
        payload = await verifier.verify(token);
      } catch (error) {
        console.error("Token verification failed:", error);
        return createCorsErrorResponse(401, "Unauthorized", requestOrigin);
      }
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      // Get user watchlist
      try {
        const command = new QueryCommand({
          TableName: process.env.USER_WATCHLIST_TABLE,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
            ":userId": userId
          }
        });

        const result = await docClient.send(command);
        
        // Return items as-is since they already have mediaId
        const items = result.Items || [];
        
        return createCorsSuccessResponse({ items: items }, requestOrigin);
      } catch (error) {
        console.error("Error getting watchlist:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
      }
    } else if (event.httpMethod === 'POST') {
      // Add to watchlist
      try {
        const requestBody = JSON.parse(event.body || '{}');
        const { mediaId, movieId, title, poster_path, release_date, vote_average } = requestBody;
        
        // Support both mediaId (new) and movieId (legacy) for backwards compatibility
        const id = mediaId || movieId;
        
        if (!id) {
          return createCorsErrorResponse(400, "Media ID is required", requestOrigin);
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
        
        return createCorsSuccessResponse({ message: "Added to watchlist successfully" }, requestOrigin);
      } catch (error) {
        console.error("Error adding to watchlist:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
      }
    } else if (event.httpMethod === 'DELETE') {
      // Remove from watchlist
      try {
        const mediaId = event.queryStringParameters?.mediaId;
        const movieId = event.queryStringParameters?.movieId;
        
        // Support both mediaId (new) and movieId (legacy) for backwards compatibility
        const id = mediaId || movieId;
        
        if (!id) {
          return createCorsErrorResponse(400, "Media ID is required", requestOrigin);
        }

        const command = new DeleteCommand({
          TableName: process.env.USER_WATCHLIST_TABLE,
          Key: {
            userId: userId,
            mediaId: id.toString()
          }
        });

        await docClient.send(command);
        
        return createCorsSuccessResponse({ message: "Removed from watchlist successfully" }, requestOrigin);
      } catch (error) {
        console.error("Error removing from watchlist:", error);
        return createCorsErrorResponse(500, "Internal server error", requestOrigin);
      }
    } else {
      return createCorsErrorResponse(405, "Method not allowed", requestOrigin);
    }
  } catch (error) {
    console.error("=== UNEXPECTED ERROR IN WATCHLIST FUNCTION ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Event:", JSON.stringify(event, null, 2));
    console.error("Environment:", JSON.stringify(process.env, null, 2));
    console.error("=== END ERROR DETAILS ===");
    return createCorsErrorResponse(500, "Internal server error", requestOrigin, {
      error: error.message,
      stack: error.stack,
      requestDetails: {
        httpMethod: event.httpMethod,
        headers: event.headers,
        pathParameters: event.pathParameters
      }
    });
  }
};

