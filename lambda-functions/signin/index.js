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
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json'
});

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getHeaders(event.headers?.origin || ''),
      body: ''
    };
  }

  // Handle POST request for signin
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, password } = body;

      if (!email || !password) {        return {
          statusCode: 400,
          headers: getHeaders(event.headers?.origin || ''),
          body: JSON.stringify({ error: 'Email and password are required' })
        };
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

      return {
        statusCode: 200,
        headers: getHeaders(event.headers?.origin || ''),
        body: JSON.stringify({
          AccessToken,
          IdToken,
          RefreshToken,
          email
        })
      };

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

      return {
        statusCode,
        headers: getHeaders(event.headers?.origin || ''),
        body: JSON.stringify({
          error: errorMessage,
          code: err.name
        })
      };
    }
  }

  // Invalid request handler
  return {
    statusCode: 400,
    headers: getHeaders(event.headers?.origin || ''),
    body: JSON.stringify({ error: 'Invalid request method or path' })
  };
};
