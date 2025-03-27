import { Auth } from 'aws-amplify';

const configureAuth = () => {
  Auth.configure({
    // Add custom signUp config
    signUp: {
      password: true,
      attributes: { email: true }
    }
  });
  
  // No need to override Auth methods with SECRET_HASH
  // when using a public client without a client secret
};

export default configureAuth;