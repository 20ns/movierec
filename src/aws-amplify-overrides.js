import { Auth } from 'aws-amplify';

const configureAuth = () => {
  Auth.configure({
    signUp: {
      password: true,
      attributes: { email: true }
    }
  });
};

export default configureAuth;