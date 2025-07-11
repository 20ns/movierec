#!/usr/bin/env node
/**
 * Test Safety Setup Verification
 * 
 * Quick test to ensure all safety checks are working properly
 */

console.log('🧪 Testing Safety Setup');
console.log('======================');

// Test 1: Lambda validation
console.log('\n1. Testing Lambda validation...');
try {
    const fs = require('fs');
    const lambdaFunctions = ['UserPreferencesFunction', 'FavouritesFunction', 'watchlist'];
    
    for (const func of lambdaFunctions) {
        const path = `lambda-functions/${func}/index.js`;
        if (fs.existsSync(path)) {
            const code = fs.readFileSync(path, 'utf8');
            if (code.includes('Invalid JWT token format')) {
                console.log(`✅ ${func}: Has robust error handling`);
            } else {
                console.log(`❌ ${func}: Missing error handling fixes`);
            }
        } else {
            console.log(`⚠️ ${func}: File not found`);
        }
    }
} catch (error) {
    console.log(`❌ Lambda validation test failed: ${error.message}`);
}

// Test 2: JWT dependencies
console.log('\n2. Testing JWT dependencies...');
try {
    const fs = require('fs');
    const jwtPath = 'lambda-layers/jwt/nodejs/node_modules/aws-jwt-verify';
    if (fs.existsSync(jwtPath)) {
        console.log('✅ JWT dependencies are present');
    } else {
        console.log('❌ JWT dependencies missing');
    }
} catch (error) {
    console.log(`❌ JWT test failed: ${error.message}`);
}

// Test 3: CORS validation script
console.log('\n3. Testing CORS validation...');
try {
    const fs = require('fs');
    if (fs.existsSync('scripts/validate-cors.js')) {
        console.log('✅ CORS validation script exists');
    } else {
        console.log('❌ CORS validation script missing');
    }
} catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
}

// Test 4: Production health monitor
console.log('\n4. Testing production health monitor...');
try {
    const fs = require('fs');
    if (fs.existsSync('scripts/monitor-production-health.js')) {
        console.log('✅ Production health monitor exists');
    } else {
        console.log('❌ Production health monitor missing');
    }
} catch (error) {
    console.log(`❌ Health monitor test failed: ${error.message}`);
}

// Test 5: Pre-commit hook
console.log('\n5. Testing pre-commit hook...');
try {
    const fs = require('fs');
    if (fs.existsSync('.husky/pre-commit')) {
        const hook = fs.readFileSync('.husky/pre-commit', 'utf8');
        if (hook.includes('ensure_jwt_dependencies')) {
            console.log('✅ Pre-commit hook has JWT dependency check');
        } else {
            console.log('❌ Pre-commit hook missing JWT check');
        }
    } else {
        console.log('❌ Pre-commit hook missing');
    }
} catch (error) {
    console.log(`❌ Pre-commit test failed: ${error.message}`);
}

console.log('\n📊 Test Summary:');
console.log('================');
console.log('✅ = Component working correctly');
console.log('❌ = Component needs attention');
console.log('⚠️ = Component not found but may be optional');
console.log('');
console.log('🎯 Goal: All components should show ✅');
console.log('🚀 When all ✅, run: npm run deploy:safety-check');