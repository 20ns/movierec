#!/usr/bin/env node

/**
 * AWS Resource Extraction Script
 * This script helps extract your existing AWS resources and their configurations
 * so you can bring them into your project as Infrastructure as Code
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Your existing API Gateway ID (extracted from your endpoint)
const API_GATEWAY_ID = 'n09230hhhj';
const REGION = 'eu-north-1';

// Directories to create
const EXPORT_DIR = './aws-exports';
const LAMBDA_DIR = './lambda-functions';
const CONFIG_DIR = './infrastructure-configs';

async function createDirectories() {
    console.log('📁 Creating export directories...');
    
    const dirs = [EXPORT_DIR, LAMBDA_DIR, CONFIG_DIR];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
}

async function runCommand(command, description) {
    console.log(`\n🔄 ${description}...`);
    console.log(`Command: ${command}`);
    
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error: ${error.message}`);
                resolve(null);
                return;
            }
            if (stderr) {
                console.warn(`⚠️ Warning: ${stderr}`);
            }
            console.log(`✅ Success!`);
            resolve(stdout);
        });
    });
}

async function exportAPIGateway() {
    console.log('\n🌐 EXPORTING API GATEWAY CONFIGURATION');
    
    // Get API Gateway details
    const apiDetails = await runCommand(
        `aws apigateway get-rest-api --rest-api-id ${API_GATEWAY_ID} --region ${REGION}`,
        'Getting API Gateway details'
    );
    
    if (apiDetails) {
        fs.writeFileSync(
            path.join(CONFIG_DIR, 'api-gateway-details.json'),
            apiDetails
        );
    }
    
    // Export API Gateway as Swagger/OpenAPI
    const swaggerExport = await runCommand(
        `aws apigateway get-export --parameters extensions='integrations' --rest-api-id ${API_GATEWAY_ID} --stage-name prod --export-type swagger --region ${REGION}`,
        'Exporting API Gateway as Swagger'
    );
    
    if (swaggerExport) {
        fs.writeFileSync(
            path.join(CONFIG_DIR, 'api-gateway-swagger.json'),
            swaggerExport
        );
    }
    
    // Get all resources and methods
    const resources = await runCommand(
        `aws apigateway get-resources --rest-api-id ${API_GATEWAY_ID} --region ${REGION}`,
        'Getting API Gateway resources'
    );
    
    if (resources) {
        fs.writeFileSync(
            path.join(CONFIG_DIR, 'api-gateway-resources.json'),
            resources
        );
    }
}

async function exportLambdaFunctions() {
    console.log('\n⚡ EXPORTING LAMBDA FUNCTIONS');
    
    // List all Lambda functions
    const functionsList = await runCommand(
        `aws lambda list-functions --region ${REGION}`,
        'Listing all Lambda functions'
    );
    
    if (!functionsList) return;
    
    const functions = JSON.parse(functionsList);
    
    for (const func of functions.Functions) {
        const functionName = func.FunctionName;
        console.log(`\n📦 Processing function: ${functionName}`);
        
        // Get function configuration
        const config = await runCommand(
            `aws lambda get-function-configuration --function-name ${functionName} --region ${REGION}`,
            `Getting configuration for ${functionName}`
        );
        
        if (config) {
            fs.writeFileSync(
                path.join(CONFIG_DIR, `lambda-${functionName}-config.json`),
                config
            );
        }
        
        // Download function code
        const codeInfo = await runCommand(
            `aws lambda get-function --function-name ${functionName} --region ${REGION}`,
            `Getting code info for ${functionName}`
        );
        
        if (codeInfo) {
            const codeData = JSON.parse(codeInfo);
            const downloadUrl = codeData.Code.Location;
            
            // Create function directory
            const funcDir = path.join(LAMBDA_DIR, functionName);
            if (!fs.existsSync(funcDir)) {
                fs.mkdirSync(funcDir, { recursive: true });
            }
            
            // Download the code zip
            await runCommand(
                `curl -o "${path.join(funcDir, 'function.zip')}" "${downloadUrl}"`,
                `Downloading code for ${functionName}`
            );
            
            // Extract the zip
            await runCommand(
                `cd "${funcDir}" && tar -xf function.zip`,
                `Extracting code for ${functionName}`
            );
            
            // Save function metadata
            fs.writeFileSync(
                path.join(funcDir, 'function-info.json'),
                JSON.stringify(codeData, null, 2)
            );
        }
    }
}

async function exportDynamoDBTables() {
    console.log('\n🗄️ EXPORTING DYNAMODB TABLES');
    
    // List all tables
    const tablesList = await runCommand(
        `aws dynamodb list-tables --region ${REGION}`,
        'Listing all DynamoDB tables'
    );
    
    if (!tablesList) return;
    
    const tables = JSON.parse(tablesList);
    
    for (const tableName of tables.TableNames) {
        console.log(`\n📋 Processing table: ${tableName}`);
        
        // Get table description
        const tableDesc = await runCommand(
            `aws dynamodb describe-table --table-name ${tableName} --region ${REGION}`,
            `Getting description for table ${tableName}`
        );
        
        if (tableDesc) {
            fs.writeFileSync(
                path.join(CONFIG_DIR, `dynamodb-${tableName}.json`),
                tableDesc
            );
        }
        
        // Export table data (first 100 items for reference)
        const tableData = await runCommand(
            `aws dynamodb scan --table-name ${tableName} --max-items 100 --region ${REGION}`,
            `Scanning table ${tableName} (sample data)`
        );
        
        if (tableData) {
            fs.writeFileSync(
                path.join(CONFIG_DIR, `dynamodb-${tableName}-sample-data.json`),
                tableData
            );
        }
    }
}

async function exportCognitoUserPools() {
    console.log('\n👤 EXPORTING COGNITO CONFIGURATION');
    
    // Your existing user pool ID
    const userPoolId = 'eu-north-1_x2FwI0mFK';
    
    const userPoolDesc = await runCommand(
        `aws cognito-idp describe-user-pool --user-pool-id ${userPoolId} --region ${REGION}`,
        'Getting Cognito User Pool configuration'
    );
    
    if (userPoolDesc) {
        fs.writeFileSync(
            path.join(CONFIG_DIR, 'cognito-user-pool.json'),
            userPoolDesc
        );
    }
    
    // Get user pool client details
    const clientId = '4gob38of1s9tu7h9ciik5unjrl';
    const clientDesc = await runCommand(
        `aws cognito-idp describe-user-pool-client --user-pool-id ${userPoolId} --client-id ${clientId} --region ${REGION}`,
        'Getting Cognito User Pool Client configuration'
    );
    
    if (clientDesc) {
        fs.writeFileSync(
            path.join(CONFIG_DIR, 'cognito-user-pool-client.json'),
            clientDesc
        );
    }
}

async function generateSummaryReport() {
    console.log('\n📊 GENERATING SUMMARY REPORT');
    
    const report = {
        exportDate: new Date().toISOString(),
        region: REGION,
        apiGatewayId: API_GATEWAY_ID,
        exportedResources: {
            lambdaFunctions: [],
            dynamodbTables: [],
            apiGateway: true,
            cognito: true
        },
        nextSteps: [
            '1. Review exported configurations in ./infrastructure-configs/',
            '2. Review Lambda function code in ./lambda-functions/',
            '3. Use the CDK templates to recreate infrastructure',
            '4. Test thoroughly before switching DNS/endpoints',
            '5. Update frontend to use new endpoints'
        ]
    };
    
    // Count exported resources
    if (fs.existsSync(LAMBDA_DIR)) {
        report.exportedResources.lambdaFunctions = fs.readdirSync(LAMBDA_DIR);
    }
    
    fs.writeFileSync(
        path.join(EXPORT_DIR, 'export-summary.json'),
        JSON.stringify(report, null, 2)
    );
    
    console.log('\n🎉 EXPORT COMPLETE!');
    console.log('📁 Check the following directories:');
    console.log(`   - ${CONFIG_DIR}/ - AWS resource configurations`);
    console.log(`   - ${LAMBDA_DIR}/ - Lambda function source code`);
    console.log(`   - ${EXPORT_DIR}/ - Summary and reports`);
}

async function main() {
    console.log('🚀 AWS RESOURCE EXTRACTION TOOL');
    console.log('=====================================');
    
    try {
        await createDirectories();
        await exportAPIGateway();
        await exportLambdaFunctions();
        await exportDynamoDBTables();
        await exportCognitoUserPools();
        await generateSummaryReport();
        
        console.log('\n✅ All exports completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Review the exported files');
        console.log('2. Run: npm run setup-cdk (we\'ll create this script)');
        console.log('3. Deploy infrastructure with: cd infrastructure && cdk deploy');
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        process.exit(1);
    }
}

// Check if AWS CLI is configured
exec('aws sts get-caller-identity', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ AWS CLI not configured or not installed!');
        console.log('Please run: aws configure');
        process.exit(1);
    } else {
        console.log('✅ AWS CLI is configured');
        main();
    }
});
