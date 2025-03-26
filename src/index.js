// Remove duplicate Amplify imports
import { Amplify } from 'aws-amplify';  // Only this line
import awsConfig from './aws-config';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

Amplify.configure(awsConfig);

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);