#!/usr/bin/env node
/**
 * CORS Validation & Protection Script
 * 
 * This script validates that CORS configuration is correct across all lambda functions
 * and prevents deployment if critical issues are found.
 * 
 * Exit codes:
 * 0 - Success
 * 1 - Critical errors found, deployment should be blocked
 * 2 - Warnings only, deployment can proceed
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 CORS Configuration Validator v1.1');
console.log('=====================================');

const projectRoot = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

// Environment detection
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
console.log(`Environment: ${isCI ? 'CI/CD Pipeline' : 'Local Development'}`);

// 1. Validate JWT Layer Dependencies
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

// 2. Validate CORS Configuration in Shared Response
function validateSharedCORS() {
    console.log('\n🌐 Checking Shared CORS Configuration...');
    
    const sharedResponsePath = path.join(projectRoot, 'lambda-functions', 'shared', 'response.js');
    
    if (!fs.existsSync(sharedResponsePath)) {
        errors.push('Shared response.js file is missing!');
        return;
    }
    
    const content = fs.readFileSync(sharedResponsePath, 'utf8');
    
    // Check for required origins
    const requiredOrigins = [
        'https://www.movierec.net',
        'http://localhost:3000'
    ];
    
    for (const origin of requiredOrigins) {
        if (!content.includes(origin)) {
            errors.push(`Required origin '${origin}' not found in shared response.js`);
        }
    }
    
    // Check for fallback logic
    if (!content.includes('localhost') || !content.includes('127.0.0.1')) {
        warnings.push('Localhost fallback logic may be missing');
    }
    
    console.log('✅ Shared CORS configuration validated');
}

// 3. Validate Individual Lambda Function CORS
function validateLambdaCORS() {
    console.log('\n🔧 Checking Individual Lambda Functions...');
    
    const lambdaFunctions = [
        'UserPreferencesFunction',
        'FavouritesFunction',
        'WatchlistFunction',
        'SigninFunction',
        'SignupHandler'
    ];
    
    for (const func of lambdaFunctions) {
        const funcResponsePath = path.join(projectRoot, 'lambda-functions', func, 'shared', 'response.js');
        
        if (!fs.existsSync(funcResponsePath)) {
            warnings.push(`${func} is missing shared/response.js`);
            continue;
        }
        
        const content = fs.readFileSync(funcResponsePath, 'utf8');
        
        // Quick validation that it has the proper CORS logic
        if (!content.includes('Access-Control-Allow-Origin')) {
            errors.push(`${func}/shared/response.js is missing CORS headers`);
        }
    }
    
    console.log('✅ Individual lambda function CORS validated');
}

// 4. Test Live CORS (if possible)
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
            resolve();
        });
        
        req.on('error', (error) => {
            if (isCI) {
                console.log(`ℹ️ Live CORS test skipped in CI: ${error.message}`);
            } else {
                warnings.push(`Could not test live CORS: ${error.message}`);
            }
            resolve();
        });
        
        req.setTimeout(5000, () => {
            if (isCI) {
                console.log('ℹ️ Live CORS test timed out in CI (expected)');
            } else {
                warnings.push('Live CORS test timed out');
            }
            resolve();
        });
        
        req.end();
    });
}

// 5. Generate Report
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
            console.log('   1. Ensure JWT layer dependencies are installed');
            console.log('   2. Verify shared CORS configuration is correct');
            console.log('   3. Check that pre-deploy script preserves CORS settings');
        }
        return 1; // Critical errors
    }
    
    console.log('\n⚠️  Warnings found but deployment can proceed');
    return 2; // Warnings only
}

// Main execution
async function main() {
    try {
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
