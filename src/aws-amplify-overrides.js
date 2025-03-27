import { Auth } from 'aws-amplify';
import crypto from 'crypto-browserify';

// Define the calculateSecretHash function
const calculateSecretHash = (username) => {
  try {
    // Get client secret and client ID
    const clientSecret = process.env.REACT_APP_COGNITO_CLIENT_SECRET;
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
    
    if (!clientSecret || !clientId) {
      console.error('Missing clientSecret or clientId');
      return null;
    }
    
    // Create message string as required by AWS Cognito
    const message = username + clientId;
    
    // Create HMAC using sha256
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    
    // Get base64 encoded hash
    return hmac.digest('base64');
  } catch (error) {
    console.error('Error calculating secret hash:', error);
    return null;
  }
};

const configureAuth = () => {
  Auth.configure({
    // Add custom signUp config
    signUp: {
      password: true,
      attributes: { email: true }
    }
  });

  // Add secret hash to all relevant operations
  const originalSignUp = Auth.signUp;
  Auth.signUp = async (params) => {
    const secretHash = calculateSecretHash(params.username);
    return originalSignUp({
      ...params,
      SECRET_HASH: secretHash
    });
  };

  // Override confirmSignUp
  const originalConfirmSignUp = Auth.confirmSignUp;
  Auth.confirmSignUp = async (username, code, options) => {
    const secretHash = calculateSecretHash(username);
    return originalConfirmSignUp(username, code, {
      ...options,
      SECRET_HASH: secretHash
    });
  };

  // Override resendSignUp
  const originalResendSignUp = Auth.resendSignUp;
  Auth.resendSignUp = async (username, options) => {
    const secretHash = calculateSecretHash(username);
    return originalResendSignUp(username, {
      ...options,
      SECRET_HASH: secretHash
    });
  };

  // Override signIn
  const originalSignIn = Auth.signIn;
  Auth.signIn = async (usernameOrOptions, password, clientMetadata) => {
    // Handle both string and object parameters
    if (typeof usernameOrOptions === 'string') {
      const secretHash = calculateSecretHash(usernameOrOptions);
      return originalSignIn(usernameOrOptions, password, {
        ...clientMetadata,
        SECRET_HASH: secretHash
      });
    } else {
      // Handle case where first parameter is an object
      const username = usernameOrOptions.username;
      const secretHash = calculateSecretHash(username);
      return originalSignIn({
        ...usernameOrOptions,
        SECRET_HASH: secretHash
      });
    }
  };
};

export default configureAuth;