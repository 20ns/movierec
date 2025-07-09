#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('📦 Preparing Lambda functions with shared code...');

// List of Lambda functions that use the shared response module
const lambdaFunctions = [
  'FavouritesFunction',
  'MediaCache',
  'MovieRecPersonalizedApiHandler',
  'RefreshTokenLambda',
  'signin',
  'SignupHandler',
  'UserPreferencesFunction',
  'UserStatsFunction',
  'watchlist'
];

const projectRoot = path.resolve(__dirname, '..');
const sourceSharedDir = path.join(projectRoot, 'lambda-functions', 'shared');
const lambdaFunctionsDir = path.join(projectRoot, 'lambda-functions');

// Ensure source shared directory exists
if (!fs.existsSync(sourceSharedDir)) {
  console.error(`❌ Source shared directory not found: ${sourceSharedDir}`);
  process.exit(1);
}

console.log('🔄 Copying shared directory to Lambda functions...');

let successCount = 0;
let errorCount = 0;

// Helper function to copy directory recursively
function copyDir(src, dest) {
  try {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        // Only copy if file doesn't exist or is older than source
        const shouldCopy = !fs.existsSync(destPath) || 
                          fs.statSync(srcPath).mtime > fs.statSync(destPath).mtime;
        
        if (shouldCopy) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`  📄 Copied ${entry.name}`);
        } else {
          console.log(`  ⏭️  Skipped ${entry.name} (already exists and up to date)`);
        }
      }
    }
    return true;
  } catch (error) {
    console.error(`Error copying directory: ${error.message}`);
    return false;
  }
}

// Helper function to remove directory recursively
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Helper function to update import paths in a file
function updateImportPaths(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(
      /require\(["']\.\.\/shared\/response["']\)/g,
      'require("./shared/response")'
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`  📝 Updated import path in ${path.basename(filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating import paths in ${filePath}: ${error.message}`);
    return false;
  }
}

for (const func of lambdaFunctions) {
  const funcDir = path.join(lambdaFunctionsDir, func);
  const targetDir = path.join(funcDir, 'shared');
  const indexFile = path.join(funcDir, 'index.js');
  
  // Check if function directory exists
  if (!fs.existsSync(funcDir)) {
    console.warn(`⚠️  Function directory not found: ${funcDir}`);
    errorCount++;
    continue;
  }
  
  // Create shared directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy shared directory (only updates files that are newer or missing)
  if (copyDir(sourceSharedDir, targetDir)) {
    console.log(`✅ Updated shared directory for ${func}`);
    
    // Update import paths in the index.js file
    if (fs.existsSync(indexFile)) {
      updateImportPaths(indexFile);
    }
    
    successCount++;
  } else {
    console.error(`❌ Failed to update shared directory for ${func}`);
    errorCount++;
  }
}

console.log(`📊 Summary: Successfully copied: ${successCount}, Errors: ${errorCount}`);

if (errorCount > 0) {
  console.error('❌ Some functions failed to copy. Deployment may fail.');
  process.exit(1);
} else {
  console.log('✅ All Lambda functions are ready for deployment!');
}
