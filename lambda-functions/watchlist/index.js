const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

// In-memory storage for local development (persists during session)
const localDataStore = {
  favourites: {},
  watchlist: {},
  preferences: {}
};

// Configure DynamoDB client for local vs production
const dynamoDbClientConfig = {};
if (process.env.IS_OFFLINE) {
  dynamoDbClientConfig.region = 'localhost';
  dynamoDbClientConfig.endpoint = 'http://localhost:8000';
  dynamoDbClientConfig.credentials = {
    accessKeyId: 'MockAccessKeyId',
    secretAccessKey: 'MockSecretAccessKey'
  };
}

const client = new DynamoDBClient(dynamoDbClientConfig);
const docClient = DynamoDBDocumentClient.from(client);

// Create a Cognito JWT verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID,
});

// CORS headers helper
const generateCorsHeaders = (requestOrigin) => {
  const allowedOrigins = [
    'https://movierec.net',
    'https://www.movierec.net',
    'http://localhost:3000',
    'http://localhost:8080'
  ];
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Max-Age': '86400',
  };
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }
  
  return headers;
};

exports.handler = async (event) => {
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = generateCorsHeaders(requestOrigin);

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
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
    
    if (process.env.IS_OFFLINE) {
      // Bypass JWT verification in offline mode
      payload = { sub: 'offline-user-id', email: 'offline@example.com' };
    } else {
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
    }

    const userId = payload.sub;

    if (event.httpMethod === 'GET') {
      // Get user watchlist
      try {
        if (process.env.IS_OFFLINE) {
          // Use in-memory storage for offline mode
          const userWatchlist = localDataStore.watchlist[userId] || [];
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              watchlist: userWatchlist
            })
          };
        }

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

        if (process.env.IS_OFFLINE) {
          // Use in-memory storage for offline mode
          if (!localDataStore.watchlist[userId]) {
            localDataStore.watchlist[userId] = [];
          }
          
          const movieItem = {
            userId: userId,
            movieId: movieId.toString(),
            title: title || '',
            poster_path: poster_path || '',
            release_date: release_date || '',
            vote_average: vote_average || 0,
            addedAt: new Date().toISOString()
          };
          
          // Check if movie is already in watchlist
          const existingIndex = localDataStore.watchlist[userId].findIndex(item => item.movieId === movieId.toString());
          if (existingIndex === -1) {
            localDataStore.watchlist[userId].push(movieItem);
          }
          
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Added to watchlist successfully" })
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

        if (process.env.IS_OFFLINE) {
          // Use in-memory storage for offline mode
          if (localDataStore.watchlist[userId]) {
            const index = localDataStore.watchlist[userId].findIndex(item => item.movieId === movieId.toString());
            if (index !== -1) {
              localDataStore.watchlist[userId].splice(index, 1);
            }
          }
          
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Removed from watchlist successfully" })
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
