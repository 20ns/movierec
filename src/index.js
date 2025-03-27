// index.js
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-config';

// Custom authentication flow with secret hash
Amplify.configure({
  ...awsconfig,
  Auth: {
    ...awsconfig.Auth,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
    oauth: {
      ...awsconfig.Auth.oauth,
      redirectSignIn: window.location.origin,
      redirectSignOut: window.location.origin
    }
  }
});