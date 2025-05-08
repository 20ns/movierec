import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-config'; // Changed import
import App from './App';
import './index.css';

Amplify.configure(awsconfig); // Use the dynamic config


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