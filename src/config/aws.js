// Consolidated AWS Configuration
// This file provides a single source of truth for AWS configuration
// that can be used across the application

const createAWSConfig = () => {
  // Validate required environment variables
  const requiredEnvVars = [
    'REACT_APP_COGNITO_USER_POOL_ID',
    'REACT_APP_COGNITO_CLIENT_ID',
    'REACT_APP_API_GATEWAY_INVOKE_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    console.error('Please ensure all required environment variables are set in your .env file');
  }

  const config = {
    Auth: {
      region: process.env.REACT_APP_AWS_REGION || 'eu-north-1',
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
      authenticationFlowType: 'USER_PASSWORD_AUTH',
      mandatorySignIn: true,
      
      oauth: {
        domain: process.env.REACT_APP_COGNITO_DOMAIN || 'eu-north-1x2fwi0mfk.auth.eu-north-1.amazoncognito.com',
        scope: ['email', 'profile', 'openid'],
        redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/',
        redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/',
        responseType: 'code'
      }
    },
    API: {
      endpoints: [
        {
          name: 'api',
          endpoint: process.env.REACT_APP_API_GATEWAY_INVOKE_URL,
          region: process.env.REACT_APP_AWS_REGION || 'eu-north-1'
        }
      ]
    }
  };

  return config;
};

export default createAWSConfig();
