const awsconfig = {
  Auth: {
    region: 'eu-north-1',
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    
    // Add this mandatorySignIn field
    mandatorySignIn: true,
    
    // Add this OAuth config if you're using hosted UI
    oauth: {
      domain: 'movierec.com',
      scope: ['email', 'profile', 'openid'],
      redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN,
      redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT,
      responseType: 'code'
    }
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: process.env.REACT_APP_API_GATEWAY_INVOKE_URL
      }
    ]
  }
};

export default awsconfig;