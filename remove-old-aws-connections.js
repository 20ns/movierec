#!/usr/bin/env node

/**
 * Remove Old AWS Connections Script
 * This script removes all references to old AWS resources from your project
 * and ensures you're only using the new CDK-managed infrastructure
 */

const fs = require('fs');
const path = require('path');

// Old AWS resource identifiers to remove
const OLD_RESOURCES = {
    apiGatewayIds: ['n09230hhhj'],
    apiGatewayUrls: [
        'https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod',
        'https://n09230hhhj.execute-api.eu-north-1.amazonaws.com'
    ],
    amplifyUrls: [
        'https://account.d1akezqpdr5wgr.amplifyapp.com',
        'https://main.d1akezqpdr5wgr.amplifyapp.com',
        'https://dev.d1akezqpdr5wgr.amplifyapp.com'
    ]
};

// New CDK resources (keep these)
const NEW_RESOURCES = {
    apiGatewayUrl: 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
    allowedOrigins: [
        'https://movierec.net',
        'https://www.movierec.net',
        'http://localhost:3000',
        'http://localhost:8080'
    ]
};

// Files to clean up
const FILES_TO_CLEAN = [
    // Lambda functions
    'lambda-functions/MovieRecPersonalizedApiHandler/index.js',
    'lambda-functions/signin/index.js',
    'lambda-functions/SignupHandler/index.js',
    'lambda-functions/MediaCache/index.js',
    
    // Test files
    'test-api-endpoints.js',
    'tests/aws/lambda-tests.js',
    'tests/aws/endpoint-tests.js',
    
    // Documentation files that reference old resources
    'infrastructure-migration-guide.md',
    'manual-extraction-guide.md',
    
    // Extraction scripts (can be removed after migration)
    'extract-aws-resources.js',
    'extract-aws-resources.ps1',
    'migrate-lambda.js'
];

// Files to completely remove (old/temporary files)
const FILES_TO_REMOVE = [
    'extract-aws-resources.js',
    'extract-aws-resources.ps1',
    'migrate-lambda.js',
    'download-lambdas.ps1',
    'infrastructure-migration-guide.md',
    'manual-extraction-guide.md',
    'migration-complete.html',
    'migration-success.html',
    
    // Old lambda functions (if they exist)
    'lambda-functions/recommendations/index.js',
    'lambda-functions/preferences/index.js'
];

console.log('🧹 AWS Old Resource Cleanup Tool');
console.log('=' .repeat(50));

function updateLambdaFunction(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }

    console.log(`🔧 Updating ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace old Amplify URLs with new allowed origins
    OLD_RESOURCES.amplifyUrls.forEach(oldUrl => {
        if (content.includes(oldUrl)) {
            console.log(`   - Removing old Amplify URL: ${oldUrl}`);
            // Remove the specific line with the old URL
            content = content.replace(new RegExp(`\\s*'${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',?\\s*`, 'g'), '');
            updated = true;
        }
    });

    // Ensure new allowed origins are present
    if (filePath.includes('index.js') && content.includes('allowedOrigins')) {
        const newOriginsSection = `const allowedOrigins = [
    'https://movierec.net',
    'https://www.movierec.net',
    'http://localhost:3000',
    'http://localhost:8080'
];`;
        
        // Replace the entire allowedOrigins array
        const originsRegex = /const allowedOrigins = \[[^\]]*\];/s;
        if (originsRegex.test(content)) {
            content = content.replace(originsRegex, newOriginsSection);
            updated = true;
            console.log(`   ✅ Updated allowedOrigins array`);
        }
    }

    if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Updated ${filePath}`);
    } else {
        console.log(`   ℹ️  No changes needed for ${filePath}`);
    }
}

function updateTestFiles(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }

    console.log(`🔧 Updating test file ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace old API Gateway URLs with new one
    OLD_RESOURCES.apiGatewayUrls.forEach(oldUrl => {
        if (content.includes(oldUrl)) {
            console.log(`   - Replacing old API URL: ${oldUrl}`);
            content = content.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_RESOURCES.apiGatewayUrl);
            updated = true;
        }
    });

    if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Updated ${filePath}`);
    } else {
        console.log(`   ℹ️  No changes needed for ${filePath}`);
    }
}

function removeOldFiles() {
    console.log('\n🗑️  Removing old/temporary files...');
    
    FILES_TO_REMOVE.forEach(filePath => {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
                console.log(`   ✅ Removed: ${filePath}`);
            } catch (error) {
                console.log(`   ❌ Error removing ${filePath}: ${error.message}`);
            }
        } else {
            console.log(`   ℹ️  Not found: ${filePath}`);
        }
    });
}

function cleanCdkAssets() {
    console.log('\n🧹 Cleaning CDK asset files...');
    
    const cdkOutPath = path.join(process.cwd(), 'infrastructure', 'cdk.out');
    if (fs.existsSync(cdkOutPath)) {
        const assetFiles = fs.readdirSync(cdkOutPath).filter(file => 
            file.startsWith('asset.') && file.includes('index.js')
        );
        
        assetFiles.forEach(assetFile => {
            const assetPath = path.join(cdkOutPath, assetFile, 'index.js');
            if (fs.existsSync(assetPath)) {
                updateLambdaFunction(assetPath);
            }
        });
        
        console.log(`   ✅ Processed ${assetFiles.length} CDK asset files`);
    }
}

function verifyConfiguration() {
    console.log('\n✅ Verifying current configuration...');
    
    // Check .env file
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod')) {
            console.log('   ✅ .env file uses new API Gateway URL');
        } else {
            console.log('   ⚠️  .env file might need updating');
        }
    }
    
    // Check aws-config.js
    const awsConfigPath = path.join(process.cwd(), 'src', 'aws-config.js');
    if (fs.existsSync(awsConfigPath)) {
        const awsConfigContent = fs.readFileSync(awsConfigPath, 'utf8');
        if (awsConfigContent.includes('process.env.REACT_APP_API_GATEWAY_INVOKE_URL')) {
            console.log('   ✅ aws-config.js uses environment variable for API URL');
        } else {
            console.log('   ⚠️  aws-config.js might need updating');
        }
    }
}

function generateCleanupReport() {
    console.log('\n📋 Cleanup Summary');
    console.log('=' .repeat(50));
    
    const report = {
        cleanupDate: new Date().toISOString(),
        removedOldResources: {
            apiGatewayIds: OLD_RESOURCES.apiGatewayIds,
            amplifyUrls: OLD_RESOURCES.amplifyUrls
        },
        currentResources: {
            apiGatewayUrl: NEW_RESOURCES.apiGatewayUrl,
            allowedOrigins: NEW_RESOURCES.allowedOrigins
        },
        filesUpdated: FILES_TO_CLEAN.filter(file => fs.existsSync(file)),
        filesRemoved: FILES_TO_REMOVE.filter(file => !fs.existsSync(file)),
        nextSteps: [
            '1. Run tests to verify everything works: npm run test:aws',
            '2. Test your frontend locally: npm start',
            '3. Deploy any Lambda function updates: npm run deploy:infrastructure',
            '4. Monitor CloudWatch logs for any issues',
            '5. Consider removing old AWS resources manually from AWS Console'
        ]
    };
    
    fs.writeFileSync('cleanup-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Cleanup report saved to cleanup-report.json');
    
    console.log('\n🎯 Next Steps:');
    report.nextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
    });
}

function main() {
    console.log('Starting cleanup of old AWS resource references...\n');
    
    // Update Lambda functions
    console.log('🔧 Updating Lambda functions...');
    FILES_TO_CLEAN
        .filter(file => file.includes('lambda-functions') && file.endsWith('.js'))
        .forEach(updateLambdaFunction);
    
    // Update test files
    console.log('\n🔧 Updating test files...');
    FILES_TO_CLEAN
        .filter(file => file.includes('test') && file.endsWith('.js'))
        .forEach(updateTestFiles);
    
    // Clean CDK assets
    cleanCdkAssets();
    
    // Remove old files
    removeOldFiles();
    
    // Verify configuration
    verifyConfiguration();
    
    // Generate report
    generateCleanupReport();
    
    console.log('\n🎉 Cleanup complete!');
    console.log('Your project now only references the new CDK-managed infrastructure.');
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, OLD_RESOURCES, NEW_RESOURCES };
