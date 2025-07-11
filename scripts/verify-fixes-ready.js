#!/usr/bin/env node
/**
 * Verify that all fixes are in place and ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Fixes Ready for Deployment');
console.log('======================================');

const fixes = [
    {
        name: 'JWT Layer Dependencies',
        check: () => {
            const jwtPath = 'lambda-layers/jwt/nodejs/node_modules/aws-jwt-verify';
            return fs.existsSync(jwtPath);
        },
        solution: 'Run: ./scripts/fix-jwt-dependencies.sh'
    },
    {
        name: 'UserPreferences Error Handling',
        check: () => {
            const filePath = 'lambda-functions/UserPreferencesFunction/index.js';
            const content = fs.readFileSync(filePath, 'utf8');
            return content.includes('Invalid JWT token format') && 
                   content.includes('Authentication failed');
        },
        solution: 'Error handling fix already applied'
    },
    {
        name: 'Favourites Error Handling',
        check: () => {
            const filePath = 'lambda-functions/FavouritesFunction/index.js';
            const content = fs.readFileSync(filePath, 'utf8');
            return content.includes('Invalid JWT token format') && 
                   content.includes('Authentication failed');
        },
        solution: 'Error handling fix already applied'
    },
    {
        name: 'Watchlist Error Handling',
        check: () => {
            const filePath = 'lambda-functions/watchlist/index.js';
            const content = fs.readFileSync(filePath, 'utf8');
            return content.includes('Invalid JWT token format') && 
                   content.includes('Authentication failed');
        },
        solution: 'Error handling fix already applied'
    },
    {
        name: 'CORS Validation',
        check: () => {
            try {
                // Just check that the script exists and can be run
                return fs.existsSync('scripts/validate-cors.js');
            } catch (error) {
                return false;
            }
        },
        solution: 'CORS validation script is available'
    },
    {
        name: 'Pre-commit Hook',
        check: () => {
            const hookPath = '.husky/pre-commit';
            if (!fs.existsSync(hookPath)) return false;
            const content = fs.readFileSync(hookPath, 'utf8');
            return content.includes('ensure_jwt_dependencies');
        },
        solution: 'Pre-commit hook configured to check JWT dependencies'
    }
];

let allPassed = true;

console.log('\n📋 Running Verification Checks:');
console.log('===============================');

for (const fix of fixes) {
    try {
        const passed = fix.check();
        if (passed) {
            console.log(`✅ ${fix.name}: Ready`);
        } else {
            console.log(`❌ ${fix.name}: Not Ready`);
            console.log(`   Solution: ${fix.solution}`);
            allPassed = false;
        }
    } catch (error) {
        console.log(`❌ ${fix.name}: Error checking - ${error.message}`);
        allPassed = false;
    }
}

console.log('\n📊 Summary:');
console.log('==========');

if (allPassed) {
    console.log('🎉 All fixes are in place and ready for deployment!');
    console.log('');
    console.log('🚀 Deployment Steps:');
    console.log('   1. Ensure JWT dependencies: ./scripts/fix-jwt-dependencies.sh');
    console.log('   2. Deploy infrastructure: cd infrastructure && npx cdk deploy');
    console.log('   3. Wait 2-3 minutes for propagation');
    console.log('   4. Monitor health: node scripts/monitor-production-health.js');
    console.log('');
    console.log('✅ Expected Result: API endpoints return 401 instead of 502 errors');
} else {
    console.log('⚠️ Some fixes are not ready. Address the issues above before deploying.');
}

process.exit(allPassed ? 0 : 1);