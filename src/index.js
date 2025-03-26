import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
import { AuthConfig } from '@aws-amplify/auth';
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