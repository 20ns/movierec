import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================
    // EXISTING RESOURCES IMPORT
    // ============================================
    
    // Import existing Cognito User Pool
    const existingUserPool = cognito.UserPool.fromUserPoolId(
      this, 
      'ExistingUserPool', 
      'eu-north-1_x2FwI0mFK'
    );

    // Import existing Cognito User Pool Client  
    const existingUserPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      this,
      'ExistingUserPoolClient',
      '4gob38of1s9tu7h9ciik5unjrl'
    );

    // ============================================
    // EXISTING DYNAMODB TABLES (Import existing)
    // ============================================
    
    // Import existing User Preferences Table
    const userPreferencesTable = dynamodb.Table.fromTableName(
      this, 
      'UserPreferencesTable', 
      'UserPreferences'
    );

    // Import existing Movie Recommendations Cache Table
    const movieRecCacheTable = dynamodb.Table.fromTableName(
      this, 
      'MovieRecCacheTable', 
      'MovieRecCache'
    );

    // Import existing User Favorites Table
    const favouritesTable = dynamodb.Table.fromTableName(
      this, 
      'FavouritesTable', 
      'Favourites'
    );

    // Import existing User Watchlist Table
    const watchlistTable = dynamodb.Table.fromTableName(
      this, 
      'WatchlistTable', 
      'Watchlist'
    );

    // ============================================
    // IAM ROLES & POLICIES
    // ============================================
    
    // AWS SDK Lambda Layer
    const awsSdkLayer = new lambda.LayerVersion(this, 'AwsSdkLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layers/aws-sdk-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'AWS SDK v3 and common dependencies',
    });

    // Lambda execution role with DynamoDB permissions
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                userPreferencesTable.tableArn,
                movieRecCacheTable.tableArn,
                `${movieRecCacheTable.tableArn}/index/*`,
                favouritesTable.tableArn,
                watchlistTable.tableArn,
              ],
            }),
          ],
        }),
        CognitoAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cognito-idp:InitiateAuth',
                'cognito-idp:RespondToAuthChallenge',
                'cognito-idp:SignUp',
                'cognito-idp:ConfirmSignUp',
                'cognito-idp:ForgotPassword',
                'cognito-idp:ConfirmForgotPassword',
                'cognito-idp:GetUser',
              ],
              resources: [
                existingUserPool.userPoolArn,
              ],
            }),
          ],
        }),
      },
    });

    // ============================================
    // LAMBDA LAYERS
    // ============================================
    
    // JWT Lambda Layer
    const jwtLayer = new lambda.LayerVersion(this, 'JWTLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layers/jwt')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'JWT verification layer with aws-jwt-verify',
    });

    // ============================================
    // LAMBDA FUNCTIONS
    // ============================================
    
    // Shared environment variables for all Lambda functions
    const sharedEnvironment = {
      USER_PREFERENCES_TABLE: userPreferencesTable.tableName,
      RECOMMENDATIONS_CACHE_TABLE: movieRecCacheTable.tableName,
      USER_FAVORITES_TABLE: favouritesTable.tableName,
      USER_WATCHLIST_TABLE: watchlistTable.tableName,
      USER_POOL_ID: existingUserPool.userPoolId,
      COGNITO_CLIENT_ID: existingUserPoolClient.userPoolClientId,
      TMDB_API_KEY: process.env.TMDB_API_KEY || '',
      REGION: this.region,
    };

    // Sign-in Lambda Function
    const signinFunction = new lambda.Function(this, 'SigninFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/signin')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [awsSdkLayer],
    });

    // Signup Handler Lambda Function
    const signupFunction = new lambda.Function(this, 'SignupFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/SignupHandler')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [awsSdkLayer],
    });

    // Refresh Token Lambda Function
    const refreshTokenFunction = new lambda.Function(this, 'RefreshTokenFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/RefreshTokenLambda')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [awsSdkLayer],
    });

    // User Preferences Lambda Function
    const userPreferencesFunction = new lambda.Function(this, 'UserPreferencesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/UserPreferencesFunction')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [jwtLayer, awsSdkLayer],
    });

    // Favourites Lambda Function
    const favouritesFunction = new lambda.Function(this, 'FavouritesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/FavouritesFunction')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [jwtLayer, awsSdkLayer],
    });

    // Watchlist Lambda Function
    const watchlistFunction = new lambda.Function(this, 'WatchlistFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/watchlist')),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [jwtLayer, awsSdkLayer],
    });

    // Movie Recommendations Lambda Function
    const movieRecFunction = new lambda.Function(this, 'MovieRecFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/MovieRecPersonalizedApiHandler'), {
        exclude: ['node_modules', '.git', '*.md', 'test', 'tests', '.env*']
      }),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [jwtLayer, awsSdkLayer],
    });

    // Media Cache Lambda Function
    const mediaCacheFunction = new lambda.Function(this, 'MediaCacheFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-functions/MediaCache'), {
        exclude: ['node_modules', '.git', '*.md', 'test', 'tests', '.env*']
      }),
      role: lambdaExecutionRole,
      environment: sharedEnvironment,
      timeout: Duration.seconds(30),
      layers: [awsSdkLayer],
    });

    // ===========================
    // API GATEWAY
    // ===========================
    
    // Create REST API
    const api = new apigateway.RestApi(this, 'MovieRecApi', {
      restApiName: 'MovieRec API',
      description: 'Movie Recommendation API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://movierec.net',
          'https://www.movierec.net', 
          'http://localhost:3000',
          'http://localhost:8080'
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    // Cognito Authorizer for API Gateway
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [existingUserPool],
      identitySource: 'method.request.header.Authorization',
    });

    // ===========================
    // API GATEWAY ROUTES
    // ===========================

    // Auth routes (no authorization required)
    const authResource = api.root.addResource('auth');
    authResource.addResource('signin').addMethod('POST', new apigateway.LambdaIntegration(signinFunction));
    authResource.addResource('signup').addMethod('POST', new apigateway.LambdaIntegration(signupFunction));
    authResource.addResource('refresh').addMethod('POST', new apigateway.LambdaIntegration(refreshTokenFunction));

    // Protected routes (require authorization)
    const userResource = api.root.addResource('user');
    
    // User preferences
    const preferencesResource = userResource.addResource('preferences');
    preferencesResource.addMethod('GET', new apigateway.LambdaIntegration(userPreferencesFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    preferencesResource.addMethod('POST', new apigateway.LambdaIntegration(userPreferencesFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User favourites
    const favouritesResource = userResource.addResource('favourites');
    favouritesResource.addMethod('GET', new apigateway.LambdaIntegration(favouritesFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    favouritesResource.addMethod('POST', new apigateway.LambdaIntegration(favouritesFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    favouritesResource.addMethod('DELETE', new apigateway.LambdaIntegration(favouritesFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User watchlist
    const watchlistResource = userResource.addResource('watchlist');
    watchlistResource.addMethod('GET', new apigateway.LambdaIntegration(watchlistFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    watchlistResource.addMethod('POST', new apigateway.LambdaIntegration(watchlistFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    watchlistResource.addMethod('DELETE', new apigateway.LambdaIntegration(watchlistFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Movie recommendations
    const recommendationsResource = api.root.addResource('recommendations');
    recommendationsResource.addMethod('GET', new apigateway.LambdaIntegration(movieRecFunction), {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Media cache (public endpoint)
    const mediaResource = api.root.addResource('media');
    mediaResource.addMethod('GET', new apigateway.LambdaIntegration(mediaCacheFunction));

    // ===========================
    // API GATEWAY CORS FOR ERROR RESPONSES
    // ===========================
    
    // Add CORS headers to authorization error responses
    // Note: Cannot use '*' for Access-Control-Allow-Origin when credentials: 'include'
    // Need to set specific origin, defaulting to localhost for development
    api.addGatewayResponse('UnauthorizedResponse', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    api.addGatewayResponse('ForbiddenResponse', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    api.addGatewayResponse('BadRequestResponse', {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    api.addGatewayResponse('InternalServerErrorResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'http://localhost:3000'",
        'Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
        'Access-Control-Allow-Credentials': "'true'",
      },
    });

    // ===========================
    // OUTPUTS
    // ===========================
    
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'MovieRecApiUrl',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: existingUserPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'MovieRecUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: existingUserPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'MovieRecUserPoolClientId',
    });

    // Table ARNs for reference
    new cdk.CfnOutput(this, 'UserPreferencesTableName', {
      value: userPreferencesTable.tableName,
      description: 'User Preferences DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'MovieRecCacheTableName', {
      value: movieRecCacheTable.tableName,
      description: 'Movie Recommendations Cache DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'FavouritesTableName', {
      value: favouritesTable.tableName,
      description: 'Favourites DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'WatchlistTableName', {
      value: watchlistTable.tableName,
      description: 'Watchlist DynamoDB Table Name',
    });

    // Lambda Function ARNs
    new cdk.CfnOutput(this, 'SigninFunctionArn', {
      value: signinFunction.functionArn,
      description: 'Signin Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'UserPreferencesFunctionArn', {
      value: userPreferencesFunction.functionArn,
      description: 'User Preferences Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'FavouritesFunctionArn', {
      value: favouritesFunction.functionArn,
      description: 'Favourites Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'WatchlistFunctionArn', {
      value: watchlistFunction.functionArn,
      description: 'Watchlist Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'MovieRecFunctionArn', {
      value: movieRecFunction.functionArn,
      description: 'Movie Recommendations Lambda Function ARN',
    });
  }
}
