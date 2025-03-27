import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-config';

// Configure Amplify with the secret hash config
Amplify.configure({
  ...awsconfig,
  Auth: {
    ...awsconfig.Auth,
    // This is the critical part - providing the client secret
    clientSecret: process.env.REACT_APP_COGNITO_CLIENT_SECRET
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);