// src/index.js (updated)
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Configuration validation
try {
  if (!awsConfig.Auth?.userPoolId || !awsConfig.Auth?.userPoolWebClientId) {
    throw new Error('Missing required Auth configuration');
  }
  Amplify.configure(awsConfig);
  console.log('Amplify Config:', Amplify.configure());
} catch (error) {
  console.error('Amplify config error:', error);
  // Consider showing error UI
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);