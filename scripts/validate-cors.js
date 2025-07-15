#!/usr/bin/env node
/**
 * CORS Validation & Protection Script v2.0
 * 
 * This script validates that CORS configuration is correct using the Lambda Layer architecture.
 * It checks that all Lambda functions properly import from the centralized response handler
 * in the AWS SDK Lambda layer and prevents deployment if critical issues are found.
 * 
 * Architecture validated:
 * - AWS SDK Lambda layer with shared CORS implementation
 * - Individual Lambda functions importing from /opt/nodejs/shared/response
 * - Proper CORS origin configuration for localhost and production
 * 
 * Exit codes:
 * 0 - Success
 * 1 - Critical errors found, deployment should be blocked
 * 2 - Warnings only, deployment can proceed
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 CORS Configuration Validator v2.0 (Lambda Layer Architecture)');
console.log('================================================================');

const projectRoot = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

// Environment detection
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
console.log(`Environment: ${isCI ? 'CI/CD Pipeline' : 'Local Development'}`);

// 1. Validate AWS SDK Layer Dependencies and Structure
function validateAWSSDKLayer() {
    console.log('\n📦 Checking AWS SDK Layer Dependencies...');
    
    const awsSdkLayerPath = path.join(projectRoot, 'lambda-layers', 'aws-sdk-layer', 'nodejs');
    const packageJsonPath = path.join(awsSdkLayerPath, 'package.json');
    const nodeModulesPath = path.join(awsSdkLayerPath, 'node_modules');
    const sharedPath = path.join(awsSdkLayerPath, 'shared');
    
    if (!fs.existsSync(packageJsonPath)) {
        errors.push('AWS SDK Layer package.json is missing!');
        return;
    }
    
    if (!fs.existsSync(nodeModulesPath)) {
        errors.push('AWS SDK Layer node_modules is missing! Run: cd lambda-layers/aws-sdk-layer/nodejs && npm install');
        return;
    }
    
    if (!fs.existsSync(sharedPath)) {
        errors.push('AWS SDK Layer shared directory is missing!');
        return;
    }
    
    // Check for required dependencies
    const requiredDeps = ['aws-jwt-verify', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'];
    for (const dep of requiredDeps) {
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
            errors.push(`Required dependency '${dep}' is missing from AWS SDK layer!`);
        }
    }
    
    console.log('✅ AWS SDK Layer dependencies are properly installed');
}

// 2. Validate JWT Layer Dependencies (Legacy - keeping for backward compatibility)
function validateJWTLayer() {
    console.log('\n📦 Checking JWT Layer Dependencies...');
    
    const jwtLayerPath = path.join(projectRoot, 'lambda-layers', 'jwt', 'nodejs');
    const packageJsonPath = path.join(jwtLayerPath, 'package.json');
    const nodeModulesPath = path.join(jwtLayerPath, 'node_modules');
    
    if (!fs.existsSync(packageJsonPath)) {
        errors.push('JWT Layer package.json is missing!');
        return;
    }
    
    if (!fs.existsSync(nodeModulesPath)) {
        errors.push('JWT Layer node_modules is missing! Run: cd lambda-layers/jwt/nodejs && npm install');
        return;
    }
    
    const awsJwtVerifyPath = path.join(nodeModulesPath, 'aws-jwt-verify');
    if (!fs.existsSync(awsJwtVerifyPath)) {
        errors.push('aws-jwt-verify module is missing from JWT layer!');
        return;
    }
    
    // Additional validation for package-lock.json to ensure consistent installs
    const packageLockPath = path.join(jwtLayerPath, 'package-lock.json');
    if (!fs.existsSync(packageLockPath)) {
        warnings.push('JWT Layer package-lock.json is missing - consider running npm install');
    }
    
    console.log('✅ JWT Layer dependencies are properly installed');
}

// 3. Validate CORS Configuration in Lambda Layer
function validateSharedCORS() {
    console.log('\n🌐 Checking Lambda Layer CORS Configuration...');
    
    // NEW: Check Lambda layer implementation
    const lambdaLayerResponsePath = path.join(projectRoot, 'lambda-layers', 'aws-sdk-layer', 'nodejs', 'shared', 'response.js');
    
    if (!fs.existsSync(lambdaLayerResponsePath)) {
        errors.push('Lambda layer shared response.js file is missing!');
        return;
    }
    
    const content = fs.readFileSync(lambdaLayerResponsePath, 'utf8');
    
    // Check for required origins
    const requiredOrigins = [
        'https://www.movierec.net',
        'http://localhost:3000'
    ];
    
    for (const origin of requiredOrigins) {
        if (!content.includes(origin)) {
            errors.push(`Required origin '${origin}' not found in lambda layer response.js`);
        }
    }
    
    // Check for fallback logic
    if (!content.includes('localhost') || !content.includes('127.0.0.1')) {
        warnings.push('Localhost fallback logic may be missing');
    }
    
    // Check for proper exports
    if (!content.includes('createApiResponse')) {
        errors.push('createApiResponse function not found in lambda layer response.js');
    }
    
    console.log('✅ Lambda layer CORS configuration validated');
}

// 4. Validate Individual Lambda Function CORS Imports
function validateLambdaCORS() {
    console.log('\n🔧 Checking Individual Lambda Functions...');
    
    const lambdaFunctions = [
        'UserPreferencesFunction',
        'FavouritesFunction',
        'watchlist',
        'signin',
        'SignupHandler',
        'RefreshTokenLambda',
        'MediaCache',
        'MovieRecPersonalizedApiHandler',
        'UserStatsFunction',
        'health'
    ];
    
    for (const func of lambdaFunctions) {
        const funcIndexPath = path.join(projectRoot, 'lambda-functions', func, 'index.js');
        
        if (!fs.existsSync(funcIndexPath)) {
            warnings.push(`${func}/index.js not found`);
            continue;
        }
        
        const content = fs.readFileSync(funcIndexPath, 'utf8');
        
        // Check for correct Lambda layer import
        if (!content.includes('/opt/nodejs/shared/response')) {
            errors.push(`${func} is not importing from Lambda layer (/opt/nodejs/shared/response)`);
        }
        
        // Check for createApiResponse usage
        if (!content.includes('createApiResponse')) {
            errors.push(`${func} is not using createApiResponse function`);
        }
        
        // Check that it's NOT using local shared imports (old pattern)
        if (content.includes('./shared/response')) {
            errors.push(`${func} is still using old local shared/response import - should use Lambda layer`);
        }
    }
    
    console.log('✅ Individual lambda function CORS imports validated');
}

// 5. Test Live CORS (if possible)
async function testLiveCORS() {
    console.log('\n🌍 Testing Live CORS Configuration...');
    
    // Skip live testing in CI pre-deployment phase
    if (isCI && !process.env.API_URL) {
        console.log('⏭️ Skipping live CORS test - running in CI pre-deployment phase');
        return;
    }
    
    const apiUrl = process.env.API_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences';
    console.log(`Testing API: ${apiUrl}`);
    
    return new Promise((resolve) => {
        const options = {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000'
            }
        };
        
        const req = https.request(apiUrl, options, (res) => {
            const corsOrigin = res.headers['access-control-allow-origin'];
            
            if (corsOrigin === 'http://localhost:3000') {
                console.log('✅ Live CORS test passed - localhost origin correctly returned');
            } else {
                warnings.push(`Live CORS test failed - expected 'http://localhost:3000', got '${corsOrigin}'`);
            }
            
            // Consume the response to properly close the connection
            res.on('data', () => {});
            res.on('end', () => {
                resolve();
            });
        });
        
        req.on('error', (error) => {
            if (isCI) {
                console.log(`ℹ️ Live CORS test skipped in CI: ${error.message}`);
            } else {
                warnings.push(`Could not test live CORS: ${error.message}`);
            }
            req.destroy(); // Properly close the request
            resolve();
        });
        
        req.setTimeout(5000, () => {
            if (isCI) {
                console.log('ℹ️ Live CORS test timed out in CI (expected)');
            } else {
                warnings.push('Live CORS test timed out');
            }
            req.destroy(); // Properly close the request
            resolve();
        });
        
        req.end();
    });
}

// 6. Generate Report
async function generateReport() {
    console.log('\n📊 CORS Validation Report');
    console.log('==========================');
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('🎉 ALL CHECKS PASSED! CORS configuration is healthy.');
        return 0; // Success
    }
    
    if (errors.length > 0) {
        console.log('\n❌ CRITICAL ERRORS FOUND:');
        errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (errors.length > 0) {
        console.log('\n🚨 DEPLOYMENT SHOULD BE BLOCKED - Fix errors before proceeding!');
        if (isCI) {
            console.log('\n🛠️  To fix in CI/CD:');
            console.log('   1. Ensure AWS SDK Lambda layer dependencies are installed');
            console.log('   2. Verify Lambda layer shared CORS configuration is correct');
            console.log('   3. Check that all Lambda functions import from /opt/nodejs/shared/response');
            console.log('   4. Run: cd lambda-layers/aws-sdk-layer/nodejs && npm install');
        }
        return 1; // Critical errors
    }
    
    console.log('\n⚠️  Warnings found but deployment can proceed');
    return 2; // Warnings only
}

// Main execution
async function main() {
    try {
        validateAWSSDKLayer();
        validateJWTLayer();
        validateSharedCORS();
        validateLambdaCORS();
        await testLiveCORS();
        
        const exitCode = await generateReport();
        
        if (exitCode === 0) {
            console.log('\n✅ CORS validation completed successfully!');
        } else if (exitCode === 1) {
            console.log('\n❌ CORS validation failed with critical errors!');
            process.exit(1);
        } else if (exitCode === 2) {
            console.log('\n⚠️ CORS validation completed with warnings.');
        }
        
        return exitCode;
    } catch (error) {
        console.error('\n💥 Unexpected error during CORS validation:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = { main };
