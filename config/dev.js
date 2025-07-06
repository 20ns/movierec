#!/usr/bin/env node
/**
 * MovieRec Development Helper Script
 * This script provides easy commands to manage the development environment
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const commands = {
  'start': 'Start both frontend and backend servers',
  'frontend': 'Start only the frontend server',
  'backend': 'Start only the backend server',
  'test': 'Run API tests',
  'test:watch': 'Run API tests in watch mode',
  'test:coverage': 'Run API tests with coverage',
  'install': 'Install all dependencies',
  'clean': 'Clean all node_modules and reinstall',
  'cleanup': 'Clean up project structure',
  'lint': 'Run linting checks',
  'build': 'Build the frontend for production',
  'deploy': 'Deploy infrastructure',
  'status': 'Check server status',
  'help': 'Show this help message'
};

function showHelp() {
  console.log('\n🎬 MovieRec Development Helper\n');
  console.log('Usage: node dev.js <command>\n');
  console.log('Available commands:');
  Object.entries(commands).forEach(([cmd, desc]) => {
    console.log(`  ${cmd.padEnd(15)} ${desc}`);
  });
  console.log('\nExamples:');
  console.log('  node dev.js start     # Start both servers');
  console.log('  node dev.js test      # Run API tests');
  console.log('  node dev.js clean     # Clean and reinstall');
  console.log('');
}

function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on('error', reject);
  });
}

function runCommandAsync(cmd, options = {}) {
  return spawn(cmd, [], {
    stdio: 'inherit',
    shell: true,
    detached: true,
    ...options
  });
}

async function checkServerStatus() {
  console.log('🔍 Checking server status...\n');
  
  try {
    const axios = require('axios');
    
    // Check frontend
    try {
      await axios.get('http://localhost:3000', { timeout: 5000 });
      console.log('✅ Frontend: Running on http://localhost:3000');
    } catch (error) {
      console.log('❌ Frontend: Not running on http://localhost:3000');
    }
    
    // Check backend
    try {
      await axios.get('http://localhost:3001/dev/recommendations', { timeout: 5000 });
      console.log('✅ Backend: Running on http://localhost:3001');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Backend: Not running on http://localhost:3001');
      } else {
        console.log('✅ Backend: Running on http://localhost:3001 (expected auth error)');
      }
    }
  } catch (error) {
    console.log('❌ Cannot check status (axios not installed)');
  }
  
  console.log('');
}

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }

  console.log(`🎬 MovieRec Dev - Running: ${command}\n`);

  try {
    switch (command) {
      case 'start':
        console.log('🚀 Starting both frontend and backend...');
        console.log('📝 Frontend will be available at: http://localhost:3000');
        console.log('📝 Backend will be available at: http://localhost:3001');
        console.log('📝 Press Ctrl+C to stop both servers\n');
        
        // Start backend first
        const backend = runCommandAsync('npm run start:offline');
        
        // Wait a bit for backend to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Start frontend
        const frontend = runCommandAsync('npm start');
        
        // Wait for both processes
        await Promise.all([
          new Promise(resolve => backend.on('close', resolve)),
          new Promise(resolve => frontend.on('close', resolve))
        ]);
        break;

      case 'frontend':
        console.log('🌐 Starting frontend server...');
        await runCommand('npm', ['start']);
        break;

      case 'backend':
        console.log('⚡ Starting backend server...');
        await runCommand('npm', ['run', 'start:offline']);
        break;

      case 'test':
        console.log('🧪 Running API tests...');
        await runCommand('npm', ['run', 'test'], { cwd: 'tests' });
        break;

      case 'test:watch':
        console.log('👀 Running API tests in watch mode...');
        await runCommand('npm', ['run', 'test:watch'], { cwd: 'tests' });
        break;

      case 'test:coverage':
        console.log('📊 Running API tests with coverage...');
        await runCommand('npm', ['run', 'test:coverage'], { cwd: 'tests' });
        break;

      case 'install':
        console.log('📦 Installing dependencies...');
        await runCommand('npm', ['install']);
        console.log('📦 Installing test dependencies...');
        await runCommand('npm', ['install'], { cwd: 'tests' });
        break;

      case 'clean':
        console.log('🧹 Cleaning node_modules...');
        if (fs.existsSync('node_modules')) {
          await runCommand('rm', ['-rf', 'node_modules']);
        }
        if (fs.existsSync('tests/node_modules')) {
          await runCommand('rm', ['-rf', 'tests/node_modules']);
        }
        console.log('📦 Reinstalling dependencies...');
        await runCommand('npm', ['install']);
        await runCommand('npm', ['install'], { cwd: 'tests' });
        break;

      case 'cleanup':
        console.log('🧹 Running project cleanup...');
        await runCommand('node', ['scripts/cleanup.js']);
        break;

      case 'lint':
        console.log('🔍 Running linting checks...');
        await runCommand('npm', ['run', 'audit']);
        break;

      case 'build':
        console.log('🏗️ Building frontend for production...');
        await runCommand('npm', ['run', 'build']);
        break;

      case 'deploy':
        console.log('🚀 Deploying infrastructure...');
        await runCommand('npm', ['run', 'deploy:infrastructure']);
        break;

      case 'status':
        await checkServerStatus();
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    console.log(`✅ Command '${command}' completed successfully!`);
  } catch (error) {
    console.error(`❌ Error running '${command}':`, error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
