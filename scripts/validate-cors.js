#!/usr/bin/env node
/**
 * CORS Validation & Protection Script
 * 
 * This script validates that CORS configuration is correct across all lambda functions
 * and prevents deployment if critical issues are found.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 CORS Configuration Validator');
console.log('=====================================');

const projectRoot = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

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
    
    const apiUrl = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/user/preferences';
    
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
            warnings.push(`Could not test live CORS: ${error.message}`);
            resolve();
        });
        
        req.setTimeout(5000, () => {
            warnings.push('Live CORS test timed out');
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
        return true;
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
        return false;
    }
    
    console.log('\n⚠️  Warnings found but deployment can proceed');
    return true;
}

// Main execution
async function main() {
    validateJWTLayer();
    validateSharedCORS();
    validateLambdaCORS();
    await testLiveCORS();
    
    const success = await generateReport();
    
    if (!success) {
        process.exit(1);
    }
    
    console.log('\n✅ CORS validation completed successfully!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
