import { Amplify } from 'aws-amplify';

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      region: 'eu-north-1',
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
      mandatorySignIn: true,
      oauth: {
        domain: 'account.d1akezqpdr5wgr.amplifyapp.com',
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
  });
};
