const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { createApiResponse } = require("./shared/response");

// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle CORS preflight OPTIONS method
  if (event.httpMethod === 'OPTIONS') {
    return createApiResponse(204, null, event);
  }

  // Handle POST request for signin
  if (event.httpMethod === 'POST') {
    try {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return createApiResponse(400, { error: "Invalid JSON in request body" }, event);
      }
      const { email, password } = body;

      if (!email || !password) {
        return createApiResponse(400, { error: 'Email and password are required' }, event);
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

      return createApiResponse(200, {
        AccessToken,
        IdToken,
        RefreshToken,
        email
      }, event);

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

      return createApiResponse(statusCode, { error: errorMessage, code: err.name }, event);
    }
  }

  // Invalid request handler
  return createApiResponse(400, { error: 'Invalid request method or path' }, event);
};

