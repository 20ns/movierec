import React from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-config';
import App from './App';
import './index.css';
import configureAuth from './aws-amplify-overrides';

// Configure Amplify with the AWS configuration
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

// Apply the custom Auth overrides
configureAuth();

// Render the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);