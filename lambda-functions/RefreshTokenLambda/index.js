const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { createApiResponse } = require("/opt/nodejs/shared/response");

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

exports.handler = async (event) => {
  console.log('Refresh Token request received:', JSON.stringify(event, null, 2));

  // Handle CORS preflight OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  try {
    // Validate environment variables
    if (!process.env.COGNITO_CLIENT_ID) {
      console.error("COGNITO_CLIENT_ID environment variable is not set");
      return createApiResponse(500, { error: "Server configuration error" }, event);
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return createApiResponse(400, { error: 'Invalid JSON in request body', code: 'SyntaxError' }, event);
    }

    const { refreshToken } = body;

    if (!refreshToken) {
      return createApiResponse(400, { error: 'Refresh token is required', code: 'ValidationException' }, event);
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

    return createApiResponse(200, {
      accessToken: refreshResult.AuthenticationResult.AccessToken,
      idToken: refreshResult.AuthenticationResult.IdToken,
      expiresIn: refreshResult.AuthenticationResult.ExpiresIn
    }, event);

  } catch (error) {
    console.error('Refresh token error:', error);

    // Handle different Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return createApiResponse(401, { error: 'Invalid refresh token', code: error.name }, event);
    }

    if (error.name === 'UserNotFoundException') {
      return createApiResponse(404, { error: 'User not found', code: error.name }, event);
    }

    // Generic error response
    return createApiResponse(400, { error: 'Token refresh failed - please try again', code: error.name || 'UnexpectedError' }, event);
  }
};
