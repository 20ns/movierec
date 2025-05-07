import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-config';
import App from './App';
import './index.css';
import { configureAmplify } from './config/amplify-config';

configureAmplify();


// Render the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);