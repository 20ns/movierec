# Infrastructure Documentation

## Overview

MovieRec uses a hybrid infrastructure approach combining **AWS CDK** for Infrastructure as Code with **Serverless Framework** for local development and Lambda function management. This provides both robust production infrastructure and efficient development workflows.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud Infrastructure                  │
├─────────────────────────────────────────────────────────────────┤
│  CloudFront CDN ──► AWS Amplify (Frontend Hosting)              │
│                                    │                             │
│  API Gateway ──► Lambda Functions ──► DynamoDB Tables           │
│       │                    │                    │                │
│  Cognito ◄──────────────────┘                    │                │
│       │                                          │                │
│  CloudWatch Logs ◄───────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## Infrastructure Components

### AWS CDK Stack (`infrastructure/`)

**Technology Stack:**
- **AWS CDK v2.199.0** with TypeScript
- **Node.js 18.x** runtime environment
- **Jest testing framework** for infrastructure tests

**Main Components:**
```typescript
// Entry point: bin/infrastructure.ts
const app = new cdk.App();
new InfrastructureStack(app, 'MovieRecStack', {
  env: { 
    region: 'eu-north-1',
    account: process.env.CDK_DEFAULT_ACCOUNT 
  }
});
```

### Serverless Framework Configuration

**Purpose:** Local development and alternative deployment
- **Framework Version:** 4.0.0
- **Region:** eu-north-1 (Stockholm)
- **Runtime:** nodejs18.x
- **Development Stage:** dev

## AWS Services Architecture

### 1. Lambda Functions

**Function Specifications:**
```yaml
Runtime: nodejs18.x
Memory: 128MB (default)
Timeout: 30s (default), 300s (recommendation engine)
Region: eu-north-1
```

**Deployed Functions:**
- **Authentication:** signin, SignupHandler, RefreshTokenLambda
- **User Data:** UserPreferencesFunction, FavouritesFunction, watchlist
- **Content:** MovieRecPersonalizedApiHandler, MediaCache

**Lambda Layers:**
```yaml
awsSdkLayer:
  dependencies:
    - @aws-sdk/client-dynamodb@3.750.0
    - @aws-sdk/lib-dynamodb@3.750.0  
    - aws-jwt-verify@4.0.1
  compatibleRuntimes: [nodejs18.x]
```

### 2. API Gateway Configuration

**REST API Setup:**
```yaml
Type: AWS::ApiGateway::RestApi
CORS:
  allowOrigins:
    - https://movierec.net
    - https://www.movierec.net
    - http://localhost:3000
    - http://localhost:8080
  allowMethods: [GET, POST, DELETE, OPTIONS]
  allowHeaders: [Content-Type, Authorization]
  allowCredentials: true
```

**Endpoint Structure:**
```
/auth/
  ├── signin (POST)
  ├── signup (POST)
  └── refresh (POST)
/user/
  ├── preferences (GET, POST)
  ├── favourites (GET, POST, DELETE)
  └── watchlist (GET, POST, DELETE)
/recommendations (GET)
/media (GET)
```

### 3. DynamoDB Tables

**Table Configurations:**
```yaml
BillingMode: PAY_PER_REQUEST
Region: eu-north-1
PointInTimeRecoveryEnabled: true
```

#### UserPreferences Table
```yaml
TableName: UserPreferences
KeySchema:
  - AttributeName: userId
    KeyType: HASH
Attributes:
  - userId (String)
```

#### MovieRecCache Table
```yaml
TableName: MovieRecCache
KeySchema:
  - AttributeName: mediaId
    KeyType: HASH
  - AttributeName: mediaType
    KeyType: RANGE
GlobalSecondaryIndexes:
  - IndexName: genre-index
    PartitionKey: genre
```

#### Favourites Table
```yaml
TableName: Favourites
KeySchema:
  - AttributeName: userId
    KeyType: HASH
  - AttributeName: movieId
    KeyType: RANGE
```

#### Watchlist Table
```yaml
TableName: Watchlist
KeySchema:
  - AttributeName: userId
    KeyType: HASH
  - AttributeName: movieId
    KeyType: RANGE
```

### 4. AWS Cognito Integration

**User Pool Configuration:**
```yaml
UserPoolId: eu-north-1_x2FwI0mFK
ClientId: 4gob38of1s9tu7h9ciik5unjrl
Region: eu-north-1
```

**Authentication Features:**
- Email/password authentication
- JWT token generation
- User registration with email verification
- Password reset functionality

### 5. IAM Roles and Permissions

**Lambda Execution Role Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem",
        "dynamodb:BatchGetItem"
      ],
      "Resource": "arn:aws:dynamodb:eu-north-1:*:table/UserPreferences"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:InitiateAuth",
        "cognito-idp:SignUp",
        "cognito-idp:ConfirmSignUp"
      ],
      "Resource": "arn:aws:cognito-idp:eu-north-1:*:userpool/eu-north-1_x2FwI0mFK"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:eu-north-1:*:*"
    }
  ]
}
```

## Frontend Infrastructure

### Build Configuration (`webpack.config.js`)

**Production Optimizations:**
```javascript
module.exports = {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: {
            drop_console: true
          }
        }
      })
    ]
  },
  plugins: [
    new SubresourceIntegrityPlugin({
      hashFuncNames: ['sha256', 'sha384'],
      enabled: true
    })
  ]
};
```

**Asset Optimization:**
- **Image Compression:** image-webpack-loader with WebP support
- **Code Splitting:** Automatic vendor/app bundle separation
- **Subresource Integrity:** SHA-256/384 hashes for security
- **Tree Shaking:** Unused code elimination

### Hosting Infrastructure

**AWS Amplify Configuration:**
- **Source:** GitHub repository integration
- **Build Command:** `npm run build`
- **Output Directory:** `dist/`
- **Environment Variables:** Automated injection
- **Custom Domain:** movierec.net with SSL/TLS

## Environment Configuration

### Required Environment Variables

**Production Environment:**
```bash
# TMDB API Integration
REACT_APP_TMDB_API_KEY=your_production_tmdb_key
REACT_APP_FANART_TV_API_KEY=your_fanart_key

# AWS Cognito
REACT_APP_COGNITO_USER_POOL_ID=eu-north-1_x2FwI0mFK
REACT_APP_COGNITO_CLIENT_ID=4gob38of1s9tu7h9ciik5unjrl

# API Gateway
REACT_APP_API_GATEWAY_INVOKE_URL=https://your-api-id.execute-api.eu-north-1.amazonaws.com/prod

# OAuth Redirects
REACT_APP_REDIRECT_SIGN_IN=https://movierec.net/
REACT_APP_REDIRECT_SIGN_OUT=https://movierec.net/
```

**Development Environment:**
```bash
# Same as production but with local/dev values
REACT_APP_API_GATEWAY_INVOKE_URL=http://localhost:3001
REACT_APP_REDIRECT_SIGN_IN=http://localhost:3000/
REACT_APP_REDIRECT_SIGN_OUT=http://localhost:3000/
```

### Configuration Management

**Environment Files:**
- `.env.local` - Local development overrides
- `.env.production` - Production-specific variables
- `.env` - Default values and documentation

**CDK Context (`cdk.json`):**
```json
{
  "app": "npx ts-node --prefer-ts-exts bin/infrastructure.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
    "@aws-cdk/aws-cognito:userPoolExplicitProps": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true
  }
}
```

## Deployment Workflows

### Development Deployment

**Local Development Setup:**
```bash
# Install dependencies
npm run dev:install

# Start development environment
npm run dev                    # Both frontend and backend
npm run dev:frontend          # Frontend only (port 3000)
npm run dev:backend           # Backend only (port 3001)

# Check server status
npm run dev:status
```

**Local Infrastructure:**
```bash
# Start serverless offline
npm run start:offline

# Deploy local functions
serverless deploy --stage dev

# Deploy tables only
serverless deploy --config tables-only.yml
```

### Production Deployment

**Infrastructure Deployment:**
```bash
# Check infrastructure changes
npm run deploy:diff

# Deploy AWS infrastructure
npm run deploy:infrastructure

# Verify deployment
npm run test:aws
```

**Frontend Deployment:**
```bash
# Build production assets
npm run build

# Deploy to AWS Amplify (automatic on git push)
git push origin main
```

**Complete Deployment Process:**
1. **Code Review:** PR review and approval
2. **Testing:** Automated test suite execution
3. **Infrastructure:** CDK deployment if changes detected
4. **Frontend:** Automatic Amplify deployment
5. **Verification:** Health checks and smoke tests

## Monitoring and Observability

### CloudWatch Integration

**Log Groups:**
- `/aws/lambda/movierec-signin`
- `/aws/lambda/movierec-recommendations`
- `/aws/lambda/movierec-user-preferences`
- (Additional groups for each Lambda function)

**Metrics Monitoring:**
- Lambda execution duration
- DynamoDB read/write capacity
- API Gateway request counts
- Error rates and success metrics

**Alarms:**
```yaml
HighErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    MetricName: Errors
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    EvaluationPeriods: 2
    Period: 300
```

### Performance Monitoring

**Frontend Metrics:**
- Core Web Vitals tracking
- Bundle size monitoring
- Page load performance
- User interaction metrics

**Backend Metrics:**
- Lambda cold start rates
- DynamoDB throttling
- TMDB API response times
- Recommendation generation time

## Security Architecture

### Network Security

**API Gateway Security:**
- **CORS:** Restrictive origin policies
- **Rate Limiting:** Per-IP and per-user limits
- **Request Validation:** Schema validation at gateway level
- **SSL/TLS:** Enforced HTTPS communication

**CDN Security:**
```yaml
CloudFront:
  ViewerProtocolPolicy: redirect-to-https
  AllowedMethods: [GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE]
  CachedMethods: [GET, HEAD, OPTIONS]
  Compress: true
```

### Authentication Security

**JWT Token Validation:**
- **Algorithm:** RS256 with Cognito public keys
- **Expiration:** 1-hour access tokens
- **Refresh:** 30-day refresh tokens
- **Revocation:** Cognito-managed token invalidation

**User Data Protection:**
- **Encryption at Rest:** DynamoDB encryption enabled
- **Encryption in Transit:** TLS 1.2+ required
- **Data Isolation:** User-specific partition keys
- **Access Patterns:** Principle of least privilege

### Infrastructure Security

**IAM Best Practices:**
- **Role Separation:** Function-specific execution roles
- **Resource Restrictions:** ARN-based resource access
- **Condition Keys:** IP and time-based restrictions
- **Regular Rotation:** Automated key rotation where applicable

## Disaster Recovery

### Backup Strategy

**DynamoDB Backups:**
- **Point-in-Time Recovery:** Enabled on all tables
- **Backup Retention:** 35-day retention period
- **Cross-Region:** Manual backup replication for critical data

**Infrastructure Backup:**
- **CDK Code:** Version-controlled infrastructure definitions
- **Configuration:** Environment variables in secure storage
- **Deployment Scripts:** Automated recovery procedures

### Recovery Procedures

**Service Recovery:**
1. **Identify Impact:** Monitoring alerts and user reports
2. **Isolate Issue:** Component-level diagnosis
3. **Execute Recovery:** Automated or manual recovery procedures
4. **Verify Recovery:** Health checks and functional testing
5. **Post-Incident:** Analysis and improvement recommendations

**Data Recovery:**
```bash
# Point-in-time recovery example
aws dynamodb restore-table-to-point-in-time \
  --source-table-name UserPreferences \
  --target-table-name UserPreferences-Recovery \
  --restore-date-time 2024-01-01T12:00:00Z
```

## Cost Optimization

### Resource Optimization

**Lambda Functions:**
- **Memory Allocation:** Right-sized based on performance testing
- **Execution Duration:** Optimized code for faster execution
- **Concurrency Limits:** Prevent unexpected scaling costs

**DynamoDB:**
- **Billing Mode:** PAY_PER_REQUEST for variable workloads
- **Auto Scaling:** Automatic capacity adjustments
- **Query Optimization:** Efficient access patterns

**Storage:**
- **S3 Lifecycle:** Automated transition to cheaper storage classes
- **CloudWatch Logs:** Retention policies to control log storage costs
- **Asset Compression:** Reduced bandwidth and storage costs

### Cost Monitoring

**Budget Alerts:**
```yaml
MovieRecBudget:
  Type: AWS::Budgets::Budget
  Properties:
    Budget:
      BudgetName: MovieRec-Monthly-Budget
      BudgetLimit:
        Amount: 50
        Unit: USD
      TimeUnit: MONTHLY
      BudgetType: COST
```

This infrastructure documentation provides a comprehensive overview of the MovieRec platform's AWS architecture, enabling efficient development, deployment, and maintenance of the application.