#!/usr/bin/env node
/**
 * JWT Health Check Script
 * 
 * This script helps diagnose JWT layer dependency issues and provides
 * recommendations for fixing them.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 JWT Layer Health Check');
console.log('=========================');

const projectRoot = path.resolve(__dirname, '..');
const jwtLayerPath = path.join(projectRoot, 'lambda-layers', 'jwt', 'nodejs');

// Check if JWT layer directory exists
function checkJWTLayerStructure() {
    console.log('\n📁 Checking JWT layer structure...');
    
    const checkPaths = [
        { path: 'lambda-layers', name: 'Lambda layers directory' },
        { path: 'lambda-layers/jwt', name: 'JWT layer directory' },
        { path: 'lambda-layers/jwt/nodejs', name: 'JWT nodejs directory' },
        { path: 'lambda-layers/jwt/nodejs/package.json', name: 'JWT package.json' },
        { path: 'lambda-layers/jwt/nodejs/node_modules', name: 'JWT node_modules' },
        { path: 'lambda-layers/jwt/nodejs/node_modules/aws-jwt-verify', name: 'aws-jwt-verify module' }
    ];
    
    for (const check of checkPaths) {
        const fullPath = path.join(projectRoot, check.path);
        const exists = fs.existsSync(fullPath);
        console.log(`${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
}

// Check .gitignore to see if JWT dependencies are being ignored
function checkGitignore() {
    console.log('\n📋 Checking .gitignore configuration...');
    
    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        console.log('❌ .gitignore file not found');
        return;
    }
    
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const lines = gitignoreContent.split('\n');
    
    const problematicPatterns = [
        'lambda-layers/',
        'lambda-layers/jwt/',
        'lambda-layers/*/node_modules',
        'lambda-layers/jwt/nodejs/node_modules'
    ];
    
    console.log('Checking for patterns that might ignore JWT dependencies:');
    for (const pattern of problematicPatterns) {
        if (lines.some(line => line.trim() === pattern)) {
            console.log(`⚠️  Found pattern: ${pattern}`);
        } else {
            console.log(`✅ Pattern not found: ${pattern}`);
        }
    }
    
    // Check if node_modules is globally ignored without exceptions
    const hasGlobalNodeModules = lines.some(line => line.trim() === 'node_modules/');
    const hasJWTException = lines.some(line => line.includes('!lambda-layers/jwt/nodejs/node_modules'));
    
    if (hasGlobalNodeModules && !hasJWTException) {
        console.log('⚠️  node_modules/ is globally ignored without JWT exception');
        console.log('💡 Consider adding: !lambda-layers/jwt/nodejs/node_modules/');
    }
}

// Check package-lock.json files
function checkPackageLocks() {
    console.log('\n🔒 Checking package-lock.json files...');
    
    const lockPaths = [
        'package-lock.json',
        'lambda-layers/jwt/nodejs/package-lock.json'
    ];
    
    for (const lockPath of lockPaths) {
        const fullPath = path.join(projectRoot, lockPath);
        const exists = fs.existsSync(fullPath);
        console.log(`${exists ? '✅' : '❌'} ${lockPath}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
}

// Provide recommendations
function provideRecommendations() {
    console.log('\n💡 Recommendations:');
    console.log('==================');
    
    const jwtNodeModulesPath = path.join(jwtLayerPath, 'node_modules');
    const awsJwtVerifyPath = path.join(jwtNodeModulesPath, 'aws-jwt-verify');
    
    if (!fs.existsSync(jwtLayerPath)) {
        console.log('🔧 1. Create JWT layer structure:');
        console.log('   mkdir -p lambda-layers/jwt/nodejs');
        console.log('   echo \'{"name":"jwt-layer","version":"1.0.0","dependencies":{"aws-jwt-verify":"^4.0.1"}}\' > lambda-layers/jwt/nodejs/package.json');
    }
    
    if (!fs.existsSync(awsJwtVerifyPath)) {
        console.log('🔧 2. Install JWT dependencies:');
        console.log('   cd lambda-layers/jwt/nodejs && npm install');
    }
    
    console.log('🔧 3. To prevent future issues:');
    console.log('   - Ensure .gitignore doesn\'t exclude JWT dependencies');
    console.log('   - Use the pre-commit hook to auto-install dependencies');
    console.log('   - Run: npm run dev:clean to reset everything if needed');
    
    console.log('\n🔧 4. Quick fix command:');
    console.log('   ./scripts/fix-jwt-dependencies.sh');
}

// Auto-fix function
function autoFix() {
    console.log('\n🔧 Auto-fixing JWT dependencies...');
    
    try {
        // Create directory structure
        if (!fs.existsSync(jwtLayerPath)) {
            fs.mkdirSync(jwtLayerPath, { recursive: true });
            console.log('✅ Created JWT layer directory');
        }
        
        // Create package.json
        const packageJsonPath = path.join(jwtLayerPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            const packageJson = {
                name: 'jwt-layer',
                version: '1.0.0',
                description: 'JWT verification layer for Lambda functions',
                dependencies: {
                    'aws-jwt-verify': '^4.0.1'
                }
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('✅ Created package.json');
        }
        
        // Install dependencies
        const { execSync } = require('child_process');
        console.log('🔧 Installing dependencies...');
        execSync('npm install', { cwd: jwtLayerPath, stdio: 'inherit' });
        console.log('✅ Dependencies installed');
        
    } catch (error) {
        console.error('❌ Auto-fix failed:', error.message);
        console.log('💡 Try running the commands manually');
    }
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    
    checkJWTLayerStructure();
    checkGitignore();
    checkPackageLocks();
    provideRecommendations();
    
    if (args.includes('--fix') || args.includes('-f')) {
        autoFix();
    } else {
        console.log('\n🔧 To auto-fix issues, run: node scripts/check-jwt-health.js --fix');
    }
}

if (require.main === module) {
    main();
}

module.exports = { main, autoFix };