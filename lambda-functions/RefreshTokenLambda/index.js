const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { 
  extractOrigin, 
  createCorsPreflightResponse, 
  createCorsErrorResponse, 
  createCorsSuccessResponse 
} = require("./cors-utils");

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

exports.handler = async (event) => {
  console.log('Refresh Token request received:', JSON.stringify(event, null, 2));
  const requestOrigin = extractOrigin(event);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsPreflightResponse(requestOrigin);
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return createCorsErrorResponse(400, 'Invalid JSON in request body', requestOrigin, { code: 'SyntaxError' });
    }

    const { refreshToken } = body;

    if (!refreshToken) {
      return createCorsErrorResponse(400, 'Refresh token is required', requestOrigin, { code: 'ValidationException' });
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

    return createCorsSuccessResponse({
      accessToken: refreshResult.AuthenticationResult.AccessToken,
      idToken: refreshResult.AuthenticationResult.IdToken,
      expiresIn: refreshResult.AuthenticationResult.ExpiresIn
    }, requestOrigin);

  } catch (error) {
    console.error('Refresh token error:', error);

    // Handle different Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return createCorsErrorResponse(401, 'Invalid refresh token', requestOrigin, { code: error.name });
    }

    if (error.name === 'UserNotFoundException') {
      return createCorsErrorResponse(404, 'User not found', requestOrigin, { code: error.name });
    }

    // Generic error response
    return createCorsErrorResponse(400, 'Token refresh failed - please try again', requestOrigin, { code: error.name || 'UnexpectedError' });
  }
};