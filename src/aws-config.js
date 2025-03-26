// aws-config.js
const awsConfig = {
  Auth: {
    region: 'eu-north-1',
    userPoolId: 'eu-north-1_x2FwI0mFK',
    userPoolWebClientId: '3ob6cukt0hlea5bef9l233rv5k',
    clientSecret: '52t2i8jqmnc7dij1ecghsu9niv6tpkskkkitqs3ffqqbir456ao',
    authenticationFlowType: 'USER_PASSWORD_AUTH', // Changed from USER_SRP_AUTH
    oauth: {
      domain: 'movierec.auth.eu-north-1.amazoncognito.com', // Actual Cognito domain
      scope: ['email', 'openid', 'profile'],
      redirectSignIn: 'https://account.d1akezqpdr5wgr.amplifyapp.com',
      redirectSignOut: 'https://account.d1akezqpdr5wgr.amplifyapp.com',
      responseType: 'code'
    }
  }
};