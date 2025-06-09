# Infrastructure Migration Guide
## Moving from AWS Console to Infrastructure as Code

### Current Infrastructure Analysis
Based on your project, you currently have:
- **API Gateway**: `https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod`
- **Lambda Functions**: For recommendations, preferences, etc.
- **DynamoDB**: For user data storage
- **Cognito**: User authentication (already configured)

### Migration Options

#### 1. AWS CDK (Recommended)
**Why CDK?**
- TypeScript/JavaScript native
- Full AWS service support
- Can import existing resources
- Excellent for complex applications

**Setup Steps:**
```bash
# Install CDK globally
npm install -g aws-cdk

# Initialize CDK in your project
mkdir infrastructure
cd infrastructure
cdk init app --language typescript

# Install required packages
npm install @aws-cdk/aws-lambda @aws-cdk/aws-apigateway @aws-cdk/aws-dynamodb @aws-cdk/aws-cognito
```

#### 2. AWS SAM (Alternative)
**Why SAM?**
- Serverless-focused
- Simpler for Lambda-heavy apps
- Good YAML-based configuration

#### 3. Terraform (Third-party)
**Why Terraform?**
- Provider agnostic
- Mature ecosystem
- Excellent state management

### Step-by-Step Migration Plan

#### Phase 1: Export Current Resources
1. **Lambda Functions**
   ```bash
   # Export Lambda function code
   aws lambda get-function --function-name your-function-name --query 'Code.Location'
   ```

2. **API Gateway Configuration**
   ```bash
   # Export API Gateway configuration
   aws apigateway get-rest-apis
   aws apigateway get-export --rest-api-id YOUR_API_ID --stage-name prod --export-type swagger
   ```

3. **DynamoDB Tables**
   ```bash
   # Export table schema
   aws dynamodb describe-table --table-name your-table-name
   ```

#### Phase 2: Create CDK Infrastructure

**Directory Structure:**
```
infrastructure/
├── bin/
│   └── movierec-stack.ts
├── lib/
│   ├── lambda/
│   │   ├── recommendations/
│   │   ├── preferences/
│   │   └── utils/
│   ├── constructs/
│   │   ├── api-stack.ts
│   │   ├── database-stack.ts
│   │   └── lambda-stack.ts
│   └── movierec-stack.ts
├── cdk.json
└── package.json
```

#### Phase 3: Import Existing Resources
CDK can import existing resources without recreating them:

```typescript
// Import existing DynamoDB table
const existingTable = Table.fromTableName(this, 'ExistingTable', 'your-table-name');

// Import existing Cognito User Pool
const existingUserPool = UserPool.fromUserPoolId(this, 'ExistingUserPool', 'eu-north-1_x2FwI0mFK');
```

### Benefits After Migration

1. **Version Control**: All infrastructure changes tracked in Git
2. **Reproducibility**: Deploy identical environments
3. **Collaboration**: Team can review infrastructure changes
4. **Automation**: CI/CD for infrastructure updates
5. **Cost Management**: Better resource tracking
6. **Documentation**: Infrastructure as documentation

### Next Steps

1. **Audit Current Resources**: Document all existing AWS resources
2. **Choose Migration Strategy**: CDK recommended for your stack
3. **Start Small**: Migrate one Lambda function first
4. **Test Thoroughly**: Ensure no service interruption
5. **Gradual Migration**: Move resources incrementally

### Environment Variables Migration

Create a `.env` file for your infrastructure:
```env
# Infrastructure Environment Variables
AWS_REGION=eu-north-1
COGNITO_USER_POOL_ID=eu-north-1_x2FwI0mFK
COGNITO_CLIENT_ID=4gob38of1s9tu7h9ciik5unjrl
TMDB_API_KEY=your_tmdb_key
ENVIRONMENT=prod
```

Would you like me to help you start with the CDK setup or export your current Lambda functions?
