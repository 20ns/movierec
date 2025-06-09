# Manual AWS Resource Extraction Guide

Since AWS CLI isn't set up, here's how to manually extract your existing AWS resources from the console:

## Step 1: Install AWS CLI (Optional but Recommended)

### Option A: Install AWS CLI v2
```powershell
# Download and install AWS CLI v2
# Go to: https://awscli.amazonaws.com/AWSCLIV2.msi
# After installation, configure it:
aws configure
```

### Option B: Manual Extraction from AWS Console

## Step 2: Export Lambda Functions Manually

### For each Lambda function in your AWS Console:

1. **Go to AWS Lambda Console** → Functions
2. **For each function** (recommendations, preferences, etc.):
   - Click on the function name
   - Go to **Code** tab → **Actions** → **Export function** → **Download deployment package**
   - Save the .zip file to `./lambda-functions/[function-name]/`
   - Extract the zip in that folder
   - Go to **Configuration** tab → Copy the configuration details
   - Save as `./infrastructure-configs/lambda-[function-name]-config.json`

### Example Lambda configuration to save:
```json
{
  "FunctionName": "recommendations-function",
  "Runtime": "nodejs18.x",
  "Role": "arn:aws:iam::account:role/service-role/lambda-role",
  "Handler": "index.handler",
  "Timeout": 30,
  "MemorySize": 512,
  "Environment": {
    "Variables": {
      "TMDB_API_KEY": "your-key",
      "DYNAMODB_TABLE": "your-table"
    }
  }
}
```

## Step 3: Export API Gateway Configuration

1. **Go to API Gateway Console**
2. **Click on your API** (the one with ID: n09230hhhj)
3. **Go to Stages** → **prod** → **Export** tab
4. **Export as Swagger + API Gateway Extensions**
5. Save as `./infrastructure-configs/api-gateway-swagger.json`
6. Also note down:
   - Resource paths (`/media-recommendations`, `/preferences`, etc.)
   - HTTP methods (GET, POST, PUT, DELETE)
   - Integration types (Lambda proxy integration)

## Step 4: Export DynamoDB Tables

1. **Go to DynamoDB Console**
2. **For each table**:
   - Click on table name
   - Go to **Overview** tab
   - Copy table schema info
   - Go to **Additional settings** → note indexes, capacity settings
   - Save schema as `./infrastructure-configs/dynamodb-[table-name].json`

### Example DynamoDB schema to save:
```json
{
  "TableName": "user-preferences",
  "KeySchema": [
    {
      "AttributeName": "userId",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

## Step 5: Document Your Current Architecture

Create `./infrastructure-configs/current-architecture.json`:
```json
{
  "region": "eu-north-1",
  "apiGateway": {
    "id": "n09230hhhj",
    "url": "https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod",
    "stage": "prod"
  },
  "cognito": {
    "userPoolId": "eu-north-1_x2FwI0mFK",
    "clientId": "4gob38of1s9tu7h9ciik5unjrl"
  },
  "lambdaFunctions": [
    "recommendations-function",
    "preferences-function",
    "favorites-function",
    "watchlist-function"
  ],
  "dynamoTables": [
    "user-preferences",
    "user-favorites",
    "user-watchlist",
    "recommendations-cache"
  ]
}
```

## Step 6: Use CDK to Recreate Infrastructure

After manual extraction, you can use CDK to recreate everything in code:

1. **Import existing resources** (no downtime)
2. **Create new resources** alongside existing ones
3. **Test thoroughly**
4. **Switch traffic to new resources**
5. **Remove old resources**

Would you like me to create the CDK templates that can import your existing resources?
