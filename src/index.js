import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import App from './App';
import './index.css';

Amplify.configure(awsExports);


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