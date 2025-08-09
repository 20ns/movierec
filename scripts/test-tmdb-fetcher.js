#!/usr/bin/env node

/**
 * Test script for TMDB Data Fetcher Lambda function
 * Usage: node scripts/test-tmdb-fetcher.js [scheduleType]
 * 
 * scheduleType options: daily, weekly, full
 */

const path = require('path');
const { spawn } = require('child_process');

// Set environment variables for testing
process.env.REACT_APP_TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY || 'your-api-key-here';
process.env.RECOMMENDATIONS_CACHE_TABLE = 'MovieRecCache';
process.env.EMBEDDING_CACHE_TABLE = 'MovieRecEmbeddingCache';
process.env.AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

console.log('🧪 TMDB Data Fetcher Test Script');
console.log('==================================');

// Import the handler
const handlerPath = path.join(__dirname, '../lambda-functions/TMDBDataFetcher/index.js');

async function testTMDBFetcher() {
    try {
        console.log('📦 Loading TMDB Data Fetcher...');
        const { handler } = require(handlerPath);
        
        const scheduleType = process.argv[2] || 'daily';
        
        console.log(`🚀 Testing with schedule type: ${scheduleType}`);
        console.log(`⏰ Start time: ${new Date().toISOString()}`);
        
        // Create test event
        const testEvent = {
            source: 'test',
            scheduleType: scheduleType,
            detail: {
                triggeredBy: 'test-script'
            }
        };
        
        // Run the test
        const startTime = Date.now();
        const result = await handler(testEvent);
        const duration = Date.now() - startTime;
        
        console.log('✅ Test completed!');
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        
        // Summary
        if (result.success) {
            console.log(`\n🎉 SUCCESS: Fetched ${result.itemsFetched} items in ${result.durationMs}ms`);
            if (result.cacheStats) {
                console.log(`📈 Cache Stats: ${result.cacheStats.totalCachedItems} total cached items`);
            }
        } else {
            console.log(`\n❌ FAILED: ${result.error}`);
        }
        
    } catch (error) {
        console.error('💥 Test failed with error:', error);
        process.exit(1);
    }
}

// Environment check
function checkEnvironment() {
    console.log('🔍 Environment Check:');
    console.log(`   TMDB API Key: ${process.env.REACT_APP_TMDB_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   AWS Region: ${process.env.AWS_REGION}`);
    console.log(`   Cache Table: ${process.env.RECOMMENDATIONS_CACHE_TABLE}`);
    
    if (!process.env.REACT_APP_TMDB_API_KEY || process.env.REACT_APP_TMDB_API_KEY === 'your-api-key-here') {
        console.log('\n⚠️  WARNING: TMDB API Key not set or using placeholder value');
        console.log('   Set REACT_APP_TMDB_API_KEY environment variable');
        console.log('   Or update the .env file in the project root');
        return false;
    }
    
    return true;
}

// Show usage
function showUsage() {
    console.log('Usage: node scripts/test-tmdb-fetcher.js [scheduleType]');
    console.log('');
    console.log('Schedule Types:');
    console.log('  daily   - Fetch popular and trending content (default)');
    console.log('  weekly  - Fetch genre-based and specialized content');
    console.log('  full    - Full refresh (daily + weekly)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/test-tmdb-fetcher.js daily');
    console.log('  node scripts/test-tmdb-fetcher.js weekly');
    console.log('  node scripts/test-tmdb-fetcher.js full');
}

// Main execution
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showUsage();
        return;
    }
    
    console.log('');
    
    if (!checkEnvironment()) {
        process.exit(1);
    }
    
    console.log('');
    await testTMDBFetcher();
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

// Run the test
main().catch(error => {
    console.error('💥 Main execution failed:', error);
    process.exit(1);
});