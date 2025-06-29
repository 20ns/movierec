const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const client = new DynamoDBClient({});
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
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
      // Get user preferences
      try {
        const command = new GetCommand({
          TableName: process.env.USER_PREFERENCES_TABLE,
          Key: { userId: userId }
        });

        const result = await docClient.send(command);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            preferences: result.Item || {
              userId: userId,
              genres: [],
              keywords: [],
              minRating: 0,
              maxRating: 10,
              releaseYearStart: 1900,
              releaseYearEnd: new Date().getFullYear()
            }
          })
        };
      } catch (error) {
        console.error("Error getting preferences:", error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Internal server error" })
        };
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
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ message: "Preferences updated successfully" })
        };
      } catch (error) {
        console.error("Error updating preferences:", error);
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
