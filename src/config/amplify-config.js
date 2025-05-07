import awsconfig from '../aws-config';
import { Amplify } from 'aws-amplify';

export const configureAmplify = () => {
  Amplify.configure(awsconfig);
};
