const { 
    CognitoIdentityProviderClient, 
    SignUpCommand, 
    ConfirmSignUpCommand 
  } = require('@aws-sdk/client-cognito-identity-provider');
  const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
  const crypto = require('crypto');
    const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-north-1' });
  const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
  
  const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
  const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
    const allowedOrigins = [
    'https://movierec.net',
    'https://www.movierec.net',
    'http://localhost:3000',
    'http://localhost:8080'
  ];
  
  const getHeaders = (origin) => ({
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  });
    const generateSecretHash = (username) => {
    // This client doesn't use a secret, so return undefined
    if (!CLIENT_SECRET) return undefined;
    const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
    hmac.update(username + CLIENT_ID);
    return hmac.digest('base64');
  };
  
  const mapCognitoError = (err) => {
    switch (err.name) {
      case 'UsernameExistsException':
        return 'Email is already registered';
      case 'InvalidPasswordException':
        return 'Password must be at least 8 characters with uppercase, number, and special character';
      case 'InvalidParameterException':
        return 'Invalid parameters provided. Please check your input.';
      case 'CodeMismatchException':
        return 'Invalid verification code';
      case 'ExpiredCodeException':
        return 'Verification code has expired. Please request a new one.';
      case 'TooManyRequestsException':
        return 'Too many attempts. Please try again later.';
      case 'NotAuthorizedException':
        return 'Invalid credentials provided';
      default:
        console.error('Unhandled error:', err);
        return 'Registration failed - please try again';
    }
  };
    const handleSignup = async (email, password) => {
    const secretHash = generateSecretHash(email);
    
    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email }
      ]
    };
    
    // Only add SecretHash if it exists
    if (secretHash) {
      params.SecretHash = secretHash;
    }
  
    const command = new SignUpCommand(params);
    return await client.send(command);
  };
    const handleVerification = async (email, code) => {
    const secretHash = generateSecretHash(email);
    
    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    };
    
    // Only add SecretHash if it exists
    if (secretHash) {
      params.SecretHash = secretHash;
    }
  
    const command = new ConfirmSignUpCommand(params);
    return await client.send(command);
  };
  
  const addUserToDynamoDB = async (userSub, email) => {
    const params = {
      TableName: 'UserProfiles',
      Item: {
        // Use the attribute name "sub" as the partition key
        sub: { S: userSub },
        email: { S: email },
        createdAt: { S: new Date().toISOString() }
      }
    };
  
    const command = new PutItemCommand(params);
    return await ddbClient.send(command);
  };
  
  // Handle Cognito PreSignUp trigger events
  const handlePreSignUp = (event) => {
    console.log('PreSignUp trigger event:', JSON.stringify(event, null, 2));
    
    // Update the response in the event as needed.
    event.response.autoConfirmUser = false;
    event.response.autoVerifyEmail = false;
    event.response.autoVerifyPhone = false;
    return event;
  };
  
  module.exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
  
    // If this invocation is from Cognito (triggerSource exists), handle accordingly.
    if (event.triggerSource) {
      if (event.triggerSource === 'PreSignUp_SignUp') {
        return handlePreSignUp(event);
      } else {
        console.error('Unexpected trigger source:', event.triggerSource);
        throw new Error(`Invalid lambda trigger source: ${event.triggerSource}. Expected PreSignUp_SignUp.`);
      }
    }
    
    // Otherwise, assume the event is from API Gateway.
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getHeaders(event.headers?.origin || ''),
        body: ''
      };
    }
  
    if (event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body);
        let response;
  
        // If a verification code is provided, handle confirmation.
        if (body.code) {
          response = await handleVerification(body.email, body.code);
          return {
            statusCode: 200,
            headers: getHeaders(event.headers?.origin || ''),
            body: JSON.stringify({
              message: 'Email verified successfully!',
              email: body.email
            })
          };
        }
        
        // Handle the sign-up request via Cognito.
        response = await handleSignup(body.email, body.password);
        
        // Attempt to add the user to DynamoDB.
        try {
          await addUserToDynamoDB(response.UserSub, body.email);
        } catch (dbErr) {
          console.error("DynamoDB insertion error:", dbErr);
          // Optionally, decide if this should block registration.
        }
        
        return {
          statusCode: 200,
          headers: getHeaders(event.headers?.origin || ''),
          body: JSON.stringify({
            message: 'Signup successful! Please check your email for verification code',
            userSub: response.UserSub
          })
        };
  
      } catch (err) {
        console.error('Operation Error:', err);
        return {
          statusCode: 400,
          headers: getHeaders(event.headers?.origin || ''),
          body: JSON.stringify({
            error: mapCognitoError(err),
            code: err.name
          })
        };
      }
    }
  
    return {
      statusCode: 400,
      headers: getHeaders(event.headers?.origin || ''),
      body: JSON.stringify({ error: 'Invalid request method' })
    };
  };
  