const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

const { 
  extractOrigin, 
  createCorsPreflightResponse, 
  createCorsErrorResponse, 
  createCorsSuccessResponse 
} = require("./cors-utils");

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  const requestOrigin = extractOrigin(event);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createCorsPreflightResponse(requestOrigin);
  }

  // Handle POST request for signin
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (!email || !password) {
        return createCorsErrorResponse(400, 'Email and password are required', requestOrigin);
      }

      // Authenticate with Cognito
      const authCommand = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const response = await cognitoClient.send(authCommand);
      const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;

      return createCorsSuccessResponse({
        AccessToken,
        IdToken,
        RefreshToken,
        email
      }, requestOrigin);

    } catch (err) {
      console.error('Authentication Error:', err);
      
      let statusCode = 400;
      let errorMessage = err.message;
      
      if (err.name === 'NotAuthorizedException') {
        statusCode = 401;
        errorMessage = 'Invalid email or password';
      } else if (err.name === 'UserNotConfirmedException') {
        statusCode = 403;
        errorMessage = 'User account not confirmed';
      }

      return createCorsErrorResponse(statusCode, errorMessage, requestOrigin, { code: err.name });
    }
  }

  // Invalid request handler
  return createCorsErrorResponse(400, 'Invalid request method or path', requestOrigin);
};
