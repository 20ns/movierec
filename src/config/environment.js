// Environment Configuration Module
// Centralized environment variable management with fallbacks

const ENV_CONFIG = {
  // API Configuration
  API_GATEWAY_URL: process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
  
  // TMDB Configuration
  TMDB_API_KEY: process.env.REACT_APP_TMDB_API_KEY || '',
  FANART_TV_API_KEY: process.env.REACT_APP_FANART_TV_API_KEY || '',
  
  // AWS Cognito Configuration  
  COGNITO_USER_POOL_ID: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'eu-north-1_x2FwI0mFK',
  COGNITO_CLIENT_ID: process.env.REACT_APP_COGNITO_CLIENT_ID || '4gob38of1s9tu7h9ciik5unjrl',
  
  // Redirect URLs
  REDIRECT_SIGN_IN: process.env.REACT_APP_REDIRECT_SIGN_IN || 'https://www.movierec.net/',
  REDIRECT_SIGN_OUT: process.env.REACT_APP_REDIRECT_SIGN_OUT || 'https://www.movierec.net/',
  
  // Development flags
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Debug logging
  DEBUG_API: process.env.REACT_APP_DEBUG_API === 'true',
  
  // Validation function
  validate() {
    const missing = [];
    
    if (!this.API_GATEWAY_URL) missing.push('REACT_APP_API_GATEWAY_INVOKE_URL');
    if (!this.TMDB_API_KEY) missing.push('REACT_APP_TMDB_API_KEY');
    if (!this.COGNITO_USER_POOL_ID) missing.push('REACT_APP_COGNITO_USER_POOL_ID');
    if (!this.COGNITO_CLIENT_ID) missing.push('REACT_APP_COGNITO_CLIENT_ID');
    
    if (missing.length > 0) {
      console.warn('⚠️ Missing environment variables:', missing);
      if (this.IS_PRODUCTION) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
    }
    
    return missing.length === 0;
  },
  
  // Get API endpoint URL
  getApiUrl(endpoint) {
    const baseUrl = this.API_GATEWAY_URL.replace(/\/$/, ''); // Remove trailing slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  },
  
  // Debug logging function
  log(message, data = null) {
    if (this.DEBUG_API || this.IS_DEVELOPMENT) {
      console.log(`🔧 ENV: ${message}`, data || '');
    }
  }
};

// Validate on module load in production
if (ENV_CONFIG.IS_PRODUCTION) {
  ENV_CONFIG.validate();
} else {
  // In development, just warn about missing vars
  ENV_CONFIG.validate();
}

// Log current configuration in development
if (ENV_CONFIG.IS_DEVELOPMENT) {
  ENV_CONFIG.log('Environment Configuration Loaded', {
    API_GATEWAY_URL: ENV_CONFIG.API_GATEWAY_URL,
    COGNITO_USER_POOL_ID: ENV_CONFIG.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: ENV_CONFIG.COGNITO_CLIENT_ID,
    HAS_TMDB_KEY: !!ENV_CONFIG.TMDB_API_KEY
  });
}

export default ENV_CONFIG;