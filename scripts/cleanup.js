#!/usr/bin/env node
/**
 * MovieRec Project Cleanup Script
 * This script helps clean up and organize the project structure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 MovieRec Project Cleanup\n');

// Define directories to check and clean
const cleanupTasks = [
  {
    name: 'Remove undefined/temp directory',
    check: () => fs.existsSync('undefined'),
    action: () => {
      execSync('rm -rf undefined', { stdio: 'inherit' });
      console.log('✅ Removed undefined directory');
    }
  },
  {
    name: 'Clean up temporary files',
    check: () => true,
    action: () => {
      const tempFiles = ['.tmp', '.temp', '.cache'];
      tempFiles.forEach(pattern => {
        try {
          execSync(`find . -name "${pattern}" -type d -exec rm -rf {} +`, { stdio: 'pipe' });
        } catch (e) {
          // Ignore errors - files might not exist
        }
      });
      console.log('✅ Cleaned temporary files');
    }
  },
  {
    name: 'Check for unused dependencies',
    check: () => fs.existsSync('package.json'),
    action: () => {
      console.log('📦 Run "npm audit" to check for vulnerabilities');
      console.log('📦 Consider using "npx depcheck" to find unused dependencies');
    }
  },
  {
    name: 'Organize Lambda functions',
    check: () => fs.existsSync('lambda-functions'),
    action: () => {
      const lambdaDir = path.join(__dirname, 'lambda-functions');
      const functions = fs.readdirSync(lambdaDir);
      console.log(`📁 Found ${functions.length} Lambda functions:`);
      functions.forEach(func => console.log(`   - ${func}`));
    }
  }
];

// Execute cleanup tasks
cleanupTasks.forEach(task => {
  if (task.check()) {
    console.log(`🔍 ${task.name}...`);
    task.action();
  }
});

console.log('\n🎉 Cleanup completed!');
console.log('\nNext steps:');
console.log('1. Copy .env.example to .env and fill in your values');
console.log('2. Run "npm install" to update dependencies');
console.log('3. Run "npm run dev" to start development');
