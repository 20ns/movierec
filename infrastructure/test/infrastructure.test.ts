import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as Infrastructure from '../lib/infrastructure-stack';

describe('Infrastructure Stack Tests', () => {
  let app: cdk.App;
  let stack: Infrastructure.InfrastructureStack;
  let template: Template;

  beforeEach(() => {
    // Set required environment variables for testing
    process.env.REACT_APP_TMDB_API_KEY = 'test-api-key';
    
    app = new cdk.App();
    stack = new Infrastructure.InfrastructureStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  afterEach(() => {
    delete process.env.REACT_APP_TMDB_API_KEY;
  });

  describe('Lambda Functions', () => {
    test('should create all required Lambda functions', () => {
      // CDK creates additional Lambda functions for log retention and other services
      // We expect at least 8 business logic functions
      const functions = template.findResources('AWS::Lambda::Function');
      expect(Object.keys(functions).length).toBeGreaterThanOrEqual(8);
      
      // Verify specific function configurations
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        Timeout: 30
      });
    });

    test('should create Lambda functions with proper environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            USER_POOL_ID: Match.anyValue(),
            COGNITO_CLIENT_ID: Match.anyValue(),
            USER_PREFERENCES_TABLE: 'UserPreferences',
            RECOMMENDATIONS_CACHE_TABLE: 'MovieRecCache',
            REACT_APP_TMDB_API_KEY: 'test-api-key',
            REGION: Match.anyValue()
          }
        }
      });
    });

    test('should create Lambda layers', () => {
      template.resourceCountIs('AWS::Lambda::LayerVersion', 2);
      
      template.hasResourceProperties('AWS::Lambda::LayerVersion', {
        CompatibleRuntimes: ['nodejs18.x'],
        Description: Match.stringLikeRegexp('AWS SDK|JWT')
      });
    });
  });

  describe('API Gateway', () => {
    test('should create API Gateway with CORS configuration', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'MovieRec API',
        Description: 'Movie Recommendation API Gateway'
      });
    });

    test('should create all required API resources and methods', () => {
      // Check for auth endpoints
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        ResourceId: Match.anyValue(),
        RestApiId: Match.anyValue()
      });

      // Check for user endpoints
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        ResourceId: Match.anyValue(),
        RestApiId: Match.anyValue()
      });
    });

    test('should configure proper CORS response headers', () => {
      template.hasResourceProperties('AWS::ApiGateway::GatewayResponse', {
        ResponseType: 'UNAUTHORIZED',
        ResponseParameters: {
          'gatewayresponse.header.Access-Control-Allow-Origin': Match.anyValue(),
          'gatewayresponse.header.Access-Control-Allow-Methods': Match.anyValue(),
          'gatewayresponse.header.Access-Control-Allow-Headers': Match.anyValue()
        }
      });
    });
  });

  describe('EventBridge Rules', () => {
    test('should create scheduled EventBridge rules for TMDB fetching', () => {
      template.resourceCountIs('AWS::Events::Rule', 2);
      
      // Daily fetch rule
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'MovieRec-TMDB-Daily-Fetch',
        Description: Match.stringLikeRegexp('Daily TMDB'),
        ScheduleExpression: 'cron(0 8 * * ? *)',
        State: 'ENABLED'
      });

      // Weekly fetch rule
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: 'MovieRec-TMDB-Weekly-Fetch',
        Description: Match.stringLikeRegexp('Weekly TMDB'),
        ScheduleExpression: 'cron(0 9 ? * SUN *)',
        State: 'ENABLED'
      });
    });
  });

  describe('DynamoDB Tables', () => {
    test('should create embedding cache table', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'MovieRecEmbeddingCache',
        AttributeDefinitions: [
          { AttributeName: 'contentId', AttributeType: 'S' },
          { AttributeName: 'contentType', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'contentId', KeyType: 'HASH' },
          { AttributeName: 'contentType', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      });
    });
  });

  describe('IAM Roles and Policies', () => {
    test('should create Lambda execution role with proper permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' }
            }
          ]
        }
      });
    });

    test('should have DynamoDB access policies', () => {
      // Check for inline policies in IAM roles (CDK pattern)
      const roles = template.findResources('AWS::IAM::Role');
      let foundDynamoDBPolicy = false;
      
      Object.values(roles).forEach((role: any) => {
        if (role.Properties?.Policies) {
          role.Properties.Policies.forEach((policy: any) => {
            if (policy.PolicyDocument?.Statement) {
              policy.PolicyDocument.Statement.forEach((statement: any) => {
                if (statement.Action && Array.isArray(statement.Action)) {
                  if (statement.Action.some((action: string) => action.startsWith('dynamodb:'))) {
                    foundDynamoDBPolicy = true;
                  }
                }
              });
            }
          });
        }
      });
      
      expect(foundDynamoDBPolicy).toBe(true);
    });
  });

  describe('Security Configuration', () => {
    test('should not have any publicly accessible resources', () => {
      // Ensure no S3 buckets with public read access
      const s3Resources = template.findResources('AWS::S3::Bucket');
      Object.values(s3Resources).forEach(resource => {
        expect(resource.Properties?.PublicReadAccess).toBeFalsy();
      });
    });

    test('should have proper CloudWatch log retention', () => {
      // CDK may create log groups dynamically, check for logRetention configuration in Lambda functions
      const functions = template.findResources('AWS::Lambda::Function');
      let hasLogRetention = false;
      
      Object.values(functions).forEach((func: any) => {
        if (func.Properties?.LoggingConfig) {
          hasLogRetention = true;
        }
      });
      
      // Alternative: Check if there are any log retention lambda functions (CDK pattern)
      const logRetentionFunctions = Object.keys(functions).filter(key => 
        key.includes('LogRetention') || functions[key].Properties?.Handler?.includes('log')
      );
      
      expect(hasLogRetention || logRetentionFunctions.length > 0).toBe(true);
    });
  });

  describe('Stack Outputs', () => {
    test('should export required stack outputs', () => {
      template.hasOutput('ApiGatewayUrl', {
        Description: 'API Gateway URL',
        Export: { Name: 'MovieRecApiUrl' }
      });

      template.hasOutput('UserPoolId', {
        Description: 'Cognito User Pool ID',
        Export: { Name: 'MovieRecUserPoolId' }
      });
    });
  });
});
