import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

try {
  Amplify.configure(awsConfig);
  console.log('Amplify Configuration:', Amplify.configure()); 
} catch (error) {
  console.error('Amplify config error:', error);
  throw new Error('Failed to configure Amplify - check aws-config.js');
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);