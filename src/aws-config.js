import { AuthConfig } from '@aws-amplify/auth';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
      userPoolClientSecret: process.env.REACT_APP_COGNITO_CLIENT_SECRET,
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: 'account.d1akezqpdr5wgr.amplifyapp.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000',
          redirectSignOut: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000',
          responseType: 'code'
        }
      }
    }
  }
};

export default awsConfig;