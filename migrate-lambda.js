#!/usr/bin/env node

/**
 * AWS Lambda Migration Script
 * This script helps extract existing Lambda functions from AWS and prepare them for CDK deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your actual function names
const LAMBDA_FUNCTIONS = [
  'movierec-recommendations',
  'movierec-preferences', 
  'movierec-favorites',
  'movierec-watchlist',
  // Add any other Lambda function names you have
];

const REGION = 'eu-north-1';
const OUTPUT_DIR = './lambda-functions';

console.log('🚀 Starting Lambda function migration...\n');

/**
 * Utility function to run AWS CLI commands
 */
function runAwsCommand(command) {
  try {
    console.log(`Running: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    return result;
  } catch (error) {
    console.error(`Error running command: ${error.message}`);
    return null;
  }
}

/**
 * List all Lambda functions in your account
 */
function listAllLambdaFunctions() {
  console.log('📋 Listing all Lambda functions in your account...\n');
  
  const command = `aws lambda list-functions --region ${REGION} --query "Functions[].FunctionName" --output table`;
  const result = runAwsCommand(command);
  
  if (result) {
    console.log(result);
    console.log('\n📝 Please update the LAMBDA_FUNCTIONS array in this script with your actual function names.\n');
  }
}

/**
 * Extract Lambda function code and configuration
 */
function extractLambdaFunction(functionName) {
  console.log(`\n🔄 Processing function: ${functionName}`);
  
  const functionDir = path.join(OUTPUT_DIR, functionName.replace('movierec-', ''));
  
  // Ensure directory exists
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
  }
  
  try {
    // Get function configuration
    console.log(`  Getting configuration for ${functionName}...`);
    const configCommand = `aws lambda get-function-configuration --function-name ${functionName} --region ${REGION}`;
    const config = runAwsCommand(configCommand);
    
    if (config) {
      fs.writeFileSync(
        path.join(functionDir, 'function-config.json'),
        JSON.stringify(JSON.parse(config), null, 2)
      );
      console.log(`  ✅ Configuration saved to ${functionDir}/function-config.json`);
    }
    
    // Get function code download URL
    console.log(`  Getting code URL for ${functionName}...`);
    const codeCommand = `aws lambda get-function --function-name ${functionName} --region ${REGION} --query "Code.Location" --output text`;
    const codeUrl = runAwsCommand(codeCommand);
    
    if (codeUrl) {
      console.log(`  📦 Code download URL: ${codeUrl.trim()}`);
      fs.writeFileSync(
        path.join(functionDir, 'download-url.txt'),
        codeUrl.trim()
      );
      console.log(`  ✅ Download URL saved to ${functionDir}/download-url.txt`);
      console.log(`  📝 Manual step: Download and extract the ZIP file from the URL above`);
    }
    
    // Create a basic package.json for the function
    const packageJson = {
      "name": functionName,
      "version": "1.0.0",
      "description": `Lambda function: ${functionName}`,
      "main": "index.js",
      "dependencies": {
        "aws-sdk": "^2.1400.0"
      }
    };
    
    fs.writeFileSync(
      path.join(functionDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    console.log(`  ✅ package.json created`);
    
  } catch (error) {
    console.error(`  ❌ Error processing ${functionName}: ${error.message}`);
  }
}

/**
 * Create environment file template
 */
function createEnvironmentTemplate() {
  const envContent = `# Environment variables for Lambda functions
# Copy this to .env and fill in your actual values

TMDB_API_KEY=your_tmdb_api_key_here
AWS_REGION=eu-north-1
USER_PREFERENCES_TABLE=movierec-user-preferences
RECOMMENDATIONS_CACHE_TABLE=movierec-recommendations-cache
USER_FAVORITES_TABLE=movierec-user-favorites
USER_WATCHLIST_TABLE=movierec-user-watchlist

# For CDK deployment
CDK_DEFAULT_ACCOUNT=your_aws_account_id
CDK_DEFAULT_REGION=eu-north-1
`;

  fs.writeFileSync('.env.template', envContent);
  console.log('\n📝 Environment template created: .env.template');
  console.log('   Copy this to .env and fill in your actual values');
}

/**
 * Create deployment instructions
 */
function createDeploymentInstructions() {
  const instructions = `# Lambda Function Migration Instructions

## Step 1: Extract Function Code
1. Check the download URLs in each function directory
2. Download the ZIP files manually from those URLs
3. Extract the ZIP contents to their respective directories

## Step 2: Update Function Code
1. Review each function's code for hardcoded values
2. Update to use environment variables from process.env
3. Ensure all dependencies are listed in package.json

## Step 3: Test Locally (Optional)
\`\`\`bash
cd lambda-functions/recommendations
npm install
node index.js  # Test your function
\`\`\`

## Step 4: Deploy with CDK
\`\`\`bash
cd infrastructure
npm run build
npx cdk bootstrap  # Only needed once
npx cdk deploy
\`\`\`

## Step 5: Update Frontend Configuration
Update your aws-config.js with the new API Gateway URL from CDK output.

## Function Structure Expected:
Each function directory should have:
- index.js (or index.ts) - Main handler
- package.json - Dependencies
- Any other supporting files

## Environment Variables Available:
- USER_PREFERENCES_TABLE
- RECOMMENDATIONS_CACHE_TABLE  
- USER_FAVORITES_TABLE
- USER_WATCHLIST_TABLE
- TMDB_API_KEY
- REGION
`;

  fs.writeFileSync('LAMBDA_MIGRATION.md', instructions);
  console.log('\n📖 Migration instructions created: LAMBDA_MIGRATION.md');
}

// Main execution
async function main() {
  // Check if AWS CLI is installed
  try {
    execSync('aws --version', { encoding: 'utf8' });
  } catch (error) {
    console.error('❌ AWS CLI not found. Please install and configure AWS CLI first.');
    console.log('   Installation: https://aws.amazon.com/cli/');
    process.exit(1);
  }

  console.log('🔍 Checking AWS credentials...');
  try {
    execSync('aws sts get-caller-identity', { encoding: 'utf8' });
    console.log('✅ AWS credentials configured\n');
  } catch (error) {
    console.error('❌ AWS credentials not configured. Run: aws configure');
    process.exit(1);
  }

  // List all functions first
  listAllLambdaFunctions();

  // Extract each function
  for (const functionName of LAMBDA_FUNCTIONS) {
    extractLambdaFunction(functionName);
  }

  // Create helper files
  createEnvironmentTemplate();
  createDeploymentInstructions();

  console.log('\n🎉 Migration preparation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Update LAMBDA_FUNCTIONS array with your actual function names');
  console.log('2. Run this script again: node migrate-lambda.js');
  console.log('3. Download Lambda function code from the URLs provided');
  console.log('4. Follow instructions in LAMBDA_MIGRATION.md');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractLambdaFunction, LAMBDA_FUNCTIONS };
