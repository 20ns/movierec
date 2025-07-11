#!/usr/bin/env node
/**
 * Deployment Safety Check
 * 
 * Comprehensive pre-deployment validation to prevent production issues
 * This script ensures that code changes won't cause 502 errors or break production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛡️ Deployment Safety Check');
console.log('==========================');

let allPassed = true;
const errors = [];
const warnings = [];

// Helper function to run commands safely
function runCommand(command, description, required = true) {
    console.log(`\n🔧 ${description}...`);
    
    try {
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: 'pipe',
            timeout: 60000 
        });
        console.log(`✅ ${description} passed`);
        return { success: true, output: result };
    } catch (error) {
        const message = `${description} failed: ${error.message}`;
        
        if (required) {
            console.log(`❌ ${message}`);
            errors.push(message);
            allPassed = false;
        } else {
            console.log(`⚠️ ${message} (non-critical)`);
            warnings.push(message);
        }
        
        return { success: false, error: error.message };
    }
}

// 1. Validate JWT Layer Dependencies
function validateJWTDependencies() {
    console.log('\n📦 Validating JWT Layer Dependencies...');
    
    const jwtPath = 'lambda-layers/jwt/nodejs/node_modules/aws-jwt-verify';
    if (!fs.existsSync(jwtPath)) {
        errors.push('JWT layer dependencies missing - will cause 502 errors!');
        allPassed = false;
        console.log('❌ JWT dependencies missing');
        console.log('💡 Fix: ./scripts/fix-jwt-dependencies.sh');
        return false;
    }
    
    console.log('✅ JWT dependencies verified');
    return true;
}

// 2. Run CORS Validation
function validateCORS() {
    return runCommand(
        'timeout 30s node scripts/validate-cors.js',
        'CORS configuration validation'
    );
}

// 3. Run Lambda Function Validation Tests
function validateLambdaFunctions() {
    return runCommand(
        'cd tests && npm run test:lambda',
        'Lambda function validation tests'
    );
}

// 4. Run Code Quality Checks
function validateCodeQuality() {
    return runCommand(
        'npm run lint',
        'ESLint code quality check',
        false // Non-blocking
    );
}

// 5. Build Verification
function validateBuild() {
    return runCommand(
        'timeout 120s npm run build',
        'Production build verification'
    );
}

// 6. Infrastructure Validation
function validateInfrastructure() {
    return runCommand(
        'cd infrastructure && npm run pre-deploy',
        'Infrastructure preparation'
    );
}

// 7. Security Audit
function validateSecurity() {
    return runCommand(
        'npm audit --audit-level=high',
        'Security vulnerability audit',
        false // Non-blocking
    );
}

// 8. Check Production Health (if accessible)
function checkProductionHealth() {
    return runCommand(
        'timeout 30s node scripts/monitor-production-health.js',
        'Current production health check',
        false // Non-blocking
    );
}

// Main execution
async function main() {
    console.log('🚀 Running comprehensive deployment safety checks...\n');
    
    // Critical checks (blocking)
    validateJWTDependencies();
    validateCORS();
    validateLambdaFunctions();
    validateBuild();
    validateInfrastructure();
    
    // Non-critical checks (warnings only)
    validateCodeQuality();
    validateSecurity();
    checkProductionHealth();
    
    // Generate summary
    console.log('\n📊 Deployment Safety Summary');
    console.log('============================');
    
    if (errors.length > 0) {
        console.log('\n❌ CRITICAL ERRORS (Deployment Blocked):');
        errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️ WARNINGS (Check before deployment):');
        warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (allPassed) {
        console.log('\n🎉 ALL SAFETY CHECKS PASSED!');
        console.log('✅ Safe to deploy to production');
        console.log('');
        console.log('🚀 Deployment Options:');
        console.log('   1. Auto-deploy: git push origin main');
        console.log('   2. Manual deploy: cd infrastructure && npx cdk deploy');
        console.log('   3. Full deploy: ./scripts/deploy-lambda-fixes.sh');
        console.log('');
        console.log('📊 Post-deployment: node scripts/monitor-production-health.js');
    } else {
        console.log('\n🚨 DEPLOYMENT BLOCKED');
        console.log('❌ Critical issues must be resolved before deployment');
        console.log('');
        console.log('🔧 Quick Fixes:');
        console.log('   • JWT issues: ./scripts/fix-jwt-dependencies.sh');
        console.log('   • CORS issues: node scripts/validate-cors.js');
        console.log('   • Lambda issues: cd tests && npm run test:lambda');
        console.log('');
        console.log('💡 After fixes, run this script again');
    }
    
    return allPassed;
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
});

if (require.main === module) {
    main()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Safety check failed:', error.message);
            process.exit(1);
        });
}

module.exports = { main };