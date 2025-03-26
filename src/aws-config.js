// src/aws-config.js
const awsConfig = {
  Auth: {
    region: 'eu-north-1',
    userPoolId: 'eu-north-1_x2FwI0mFK',
    userPoolWebClientId: '3ob6cukt0hlea5bef9l233rv5k',
    authenticationFlowType: 'USER_SRP_AUTH',
    oauth: {
      domain: 'https://account.d1akezqpdr5wgr.amplifyapp.com/',
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'https://account.d1akezqpdr5wgr.amplifyapp.com',
      redirectSignOut: 'https://account.d1akezqpdr5wgr.amplifyapp.com',
      responseType: 'code'
    }
  }
};

export default awsConfig;