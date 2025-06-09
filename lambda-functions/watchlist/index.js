const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
};

exports.handler = async (event) => {
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight successful" })
    };
  }

  try {
    // Extract and verify JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Unauthorized" })
      };
    }

    const token = authHeader.substring(7);
    let payload;
    
    try {
      payload = await verifier.verify(token);
    } catch (error) {
      console.error("Token verification failed:", error);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Unauthorized" })
      };
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
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            watchlist: result.Items || []
          })
        };
      } catch (error) {
        console.error("Error getting watchlist:", error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    } else if (event.httpMethod === 'POST') {
      // Add to watchlist
      try {
        const requestBody = JSON.parse(event.body || '{}');
        const { movieId, title, poster_path, release_date, vote_average } = requestBody;
        
        if (!movieId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Movie ID is required" })
          };
        }

        const command = new PutCommand({
          TableName: process.env.USER_WATCHLIST_TABLE,
          Item: {
            userId: userId,
            movieId: movieId.toString(),
            title: title || '',
            poster_path: poster_path || '',
            release_date: release_date || '',
            vote_average: vote_average || 0,
            addedAt: new Date().toISOString()
          }
        });

        await docClient.send(command);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Added to watchlist successfully" })
        };
      } catch (error) {
        console.error("Error adding to watchlist:", error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    } else if (event.httpMethod === 'DELETE') {
      // Remove from watchlist
      try {
        const movieId = event.queryStringParameters?.movieId;
        
        if (!movieId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Movie ID is required" })
          };
        }

        const command = new DeleteCommand({
          TableName: process.env.USER_WATCHLIST_TABLE,
          Key: {
            userId: userId,
            movieId: movieId.toString()
          }
        });

        await docClient.send(command);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Removed from watchlist successfully" })
        };
      } catch (error) {
        console.error("Error removing from watchlist:", error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Internal server error" })
        };
      }
    } else {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
