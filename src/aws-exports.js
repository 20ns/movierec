const awsExports = {
  aws_project_region: 'eu-north-1',
  aws_cognito_region: 'eu-north-1',
  aws_user_pools_id: 'eu-north-1_x2FwI0mFK',
  aws_user_pools_web_client_id: '4gob38of1s9tu7h9ciik5unjrl',
  oauth: {
    domain: 'eu-north-1x2fwi0mfk.auth.eu-north-1.amazoncognito.com',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: 'https://www.movierec.net/',
    redirectSignOut: 'https://www.movierec.net/',
    responseType: 'code'
  },
  aws_cloud_logic_custom: [
    {
      name: 'api',
      endpoint: 'https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod',
      region: 'eu-north-1'
    }
  ]
};

export default awsExports;