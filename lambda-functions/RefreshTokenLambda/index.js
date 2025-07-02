const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

// CORS headers configuration
const allowedOrigins = [
  'https://movierec.net',
  'https://www.movierec.net',
  'http://localhost:3000',
  'http://localhost:8080'
];

const getHeaders = (origin) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[2], // Default to localhost:3000 for development
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
});

exports.handler = async (event) => {
  console.log('Refresh Token request received:', JSON.stringify(event, null, 2));

  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = getHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid JSON in request body',
          code: 'SyntaxError'
        })
      };
    }

    const { refreshToken } = body;

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Refresh token is required',
          code: 'ValidationException'
        })
      };
    }

    // Attempt to refresh the token using Cognito
    const refreshCommand = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    });

    const refreshResult = await cognitoClient.send(refreshCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        accessToken: refreshResult.AuthenticationResult.AccessToken,
        idToken: refreshResult.AuthenticationResult.IdToken,
        expiresIn: refreshResult.AuthenticationResult.ExpiresIn
      })
    };

  } catch (error) {
    console.error('Refresh token error:', error);

    // Handle different Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid refresh token',
          code: error.name
        })
      };
    }

    if (error.name === 'UserNotFoundException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found',
          code: error.name
        })
      };
    }

    // Generic error response
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Token refresh failed - please try again',
        code: error.name || 'UnexpectedError'
      })
    };
  }
};