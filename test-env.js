// Test environment variable loading
require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('REACT_APP_API_GATEWAY_INVOKE_URL:', process.env.REACT_APP_API_GATEWAY_INVOKE_URL);
console.log('REACT_APP_TMDB_API_KEY:', process.env.REACT_APP_TMDB_API_KEY ? 'SET' : 'MISSING');
console.log('REACT_APP_COGNITO_USER_POOL_ID:', process.env.REACT_APP_COGNITO_USER_POOL_ID);
console.log('REACT_APP_COGNITO_CLIENT_ID:', process.env.REACT_APP_COGNITO_CLIENT_ID);

// Test the environment config module
const path = require('path');
process.env.NODE_ENV = 'development';

// Simulate webpack DefinePlugin behavior
process.env.REACT_APP_API_GATEWAY_INVOKE_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL;
process.env.REACT_APP_TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;
process.env.REACT_APP_COGNITO_USER_POOL_ID = process.env.REACT_APP_COGNITO_USER_POOL_ID;
process.env.REACT_APP_COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;

console.log('\n=== Testing Environment Config Module ===');
try {
  // Dynamically import since this is ES module
  const ENV_CONFIG = require('./src/config/environment.js');
  console.log('Environment config loaded successfully');
  console.log('API Gateway URL:', ENV_CONFIG.default?.API_GATEWAY_URL || ENV_CONFIG.API_GATEWAY_URL);
} catch (error) {
  console.error('Error loading environment config:', error.message);
}