const awsConfig = {
  Auth: {
    region: 'eu-north-1',
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
    authenticationFlowType: 'USER_SRP_AUTH',
    clientSecret: process.env.REACT_APP_COGNITO_CLIENT_SECRET,
    oauth: {
      domain: 'account.d1akezqpdr5wgr.amplifyapp.com',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000',
      redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000',
      responseType: 'code'
    }
  }
};

export default awsConfig;