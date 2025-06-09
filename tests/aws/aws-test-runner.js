/**
 * AWS Test Suite Runner
 * Comprehensive testing of all AWS services and integrations
 */

const { runAllTests: runEndpointTests } = require('./endpoint-tests');
const { runLambdaTests } = require('./lambda-tests');
const { runDynamoDBTests } = require('./dynamodb-tests');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
  TEST_SUITES: {
    endpoints: { name: 'API Gateway Endpoints', enabled: true },
    lambda: { name: 'Lambda Functions', enabled: true },
    dynamodb: { name: 'DynamoDB Integration', enabled: true }
  },
  PARALLEL_EXECUTION: false // Set to true for faster execution, false for sequential
};

const overallResults = {
  suites: {},
  startTime: null,
  endTime: null,
  totalDuration: 0
};

/**
 * Run a single test suite
 */
async function runTestSuite(suiteName, testFunction) {
  console.log(`\n🎯 Starting ${CONFIG.TEST_SUITES[suiteName].name}`);
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  let success = false;
  let error = null;

  try {
    // Capture the exit code by wrapping the test function
    const originalExit = process.exit;
    let exitCode = 0;
    
    process.exit = (code) => {
      exitCode = code || 0;
      process.exit = originalExit; // Restore original
      success = exitCode === 0;
    };

    await testFunction();
    
    // If we reach here without exit being called, assume success
    if (process.exit === originalExit) {
      success = true;
    }

  } catch (err) {
    error = err.message;
    success = false;
  }

  const duration = Date.now() - startTime;
  
  overallResults.suites[suiteName] = {
    name: CONFIG.TEST_SUITES[suiteName].name,
    success,
    duration,
    error
  };

  console.log(`\n⏱️ ${CONFIG.TEST_SUITES[suiteName].name} completed in ${duration}ms`);
  console.log(`📊 Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
  if (error) {
    console.log(`💥 Error: ${error}`);
  }

  return { success, duration, error };
}

/**
 * Run all test suites sequentially
 */
async function runSequentialTests() {
  console.log('🔄 Running tests sequentially...');

  if (CONFIG.TEST_SUITES.endpoints.enabled) {
    await runTestSuite('endpoints', async () => {
      // Import and run endpoint tests
      const { runAllTests } = require('./endpoint-tests');
      await runAllTests();
    });
  }

  if (CONFIG.TEST_SUITES.lambda.enabled) {
    await runTestSuite('lambda', async () => {
      // Import and run lambda tests
      const { runLambdaTests } = require('./lambda-tests');
      await runLambdaTests();
    });
  }

  if (CONFIG.TEST_SUITES.dynamodb.enabled) {
    await runTestSuite('dynamodb', async () => {
      // Import and run dynamodb tests
      const { runDynamoDBTests } = require('./dynamodb-tests');
      await runDynamoDBTests();
    });
  }
}

/**
 * Run all test suites in parallel
 */
async function runParallelTests() {
  console.log('⚡ Running tests in parallel...');

  const testPromises = [];

  if (CONFIG.TEST_SUITES.endpoints.enabled) {
    testPromises.push(
      runTestSuite('endpoints', async () => {
        const { runAllTests } = require('./endpoint-tests');
        await runAllTests();
      })
    );
  }

  if (CONFIG.TEST_SUITES.lambda.enabled) {
    testPromises.push(
      runTestSuite('lambda', async () => {
        const { runLambdaTests } = require('./lambda-tests');
        await runLambdaTests();
      })
    );
  }

  if (CONFIG.TEST_SUITES.dynamodb.enabled) {
    testPromises.push(
      runTestSuite('dynamodb', async () => {
        const { runDynamoDBTests } = require('./dynamodb-tests');
        await runDynamoDBTests();
      })
    );
  }

  await Promise.allSettled(testPromises);
}

/**
 * Generate comprehensive test report
 */
function generateOverallReport() {
  console.log('\n📋 AWS Test Suite - Comprehensive Report');
  console.log('='.repeat(70));
  
  const totalSuites = Object.keys(overallResults.suites).length;
  const passedSuites = Object.values(overallResults.suites).filter(s => s.success).length;
  const failedSuites = totalSuites - passedSuites;
  
  // Executive Summary
  console.log('\n📊 Executive Summary:');
  console.log(`   Test Duration: ${overallResults.totalDuration}ms (${(overallResults.totalDuration / 1000).toFixed(2)}s)`);
  console.log(`   Test Suites: ${totalSuites}`);
  console.log(`   Passed: ${passedSuites}`);
  console.log(`   Failed: ${failedSuites}`);
  console.log(`   Success Rate: ${((passedSuites / totalSuites) * 100).toFixed(1)}%`);

  // Detailed Results
  console.log('\n📋 Detailed Results:');
  console.log('Suite'.padEnd(25) + 'Status'.padEnd(15) + 'Duration'.padEnd(12) + 'Notes');
  console.log('-'.repeat(70));

  Object.entries(overallResults.suites).forEach(([key, suite]) => {
    const status = suite.success ? '✅ PASSED' : '❌ FAILED';
    const duration = `${suite.duration}ms`;
    const notes = suite.error ? `Error: ${suite.error.substring(0, 20)}...` : 'OK';
    
    console.log(
      suite.name.padEnd(25) + 
      status.padEnd(15) + 
      duration.padEnd(12) + 
      notes
    );
  });

  // Performance Analysis
  console.log('\n⚡ Performance Analysis:');
  const durations = Object.values(overallResults.suites).map(s => s.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const slowestSuite = Object.entries(overallResults.suites)
    .find(([_, suite]) => suite.duration === maxDuration)?.[1];

  console.log(`   Average suite duration: ${avgDuration.toFixed(2)}ms`);
  console.log(`   Slowest suite: ${slowestSuite?.name} (${maxDuration}ms)`);
  console.log(`   Total execution time: ${overallResults.totalDuration}ms`);

  // Infrastructure Health
  console.log('\n🏥 Infrastructure Health Assessment:');
  
  if (passedSuites === totalSuites) {
    console.log('   🟢 EXCELLENT: All AWS services are functioning correctly');
    console.log('   ✅ API Gateway: Operational');
    console.log('   ✅ Lambda Functions: Operational');
    console.log('   ✅ DynamoDB: Operational');
    console.log('   ✅ Authentication: Operational');
    console.log('   ✅ CORS: Properly configured');
  } else if (passedSuites > failedSuites) {
    console.log('   🟡 GOOD: Most AWS services are functioning, some issues detected');
    console.log('   ⚠️ Review failed test suites for specific issues');
  } else {
    console.log('   🔴 POOR: Multiple AWS services have issues');
    console.log('   🚨 Immediate attention required');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  
  const failedSuitesList = Object.values(overallResults.suites).filter(s => !s.success);
  
  if (failedSuitesList.length === 0) {
    console.log('   ✅ No action required - all systems operational');
    console.log('   📈 Consider setting up automated monitoring');
    console.log('   🔄 Schedule regular testing to maintain quality');
  } else {
    console.log('   🔍 Investigate failed test suites:');
    failedSuitesList.forEach(suite => {
      console.log(`     - ${suite.name}: ${suite.error || 'Check detailed logs'}`);
    });
    console.log('   📊 Check CloudWatch logs for detailed error information');
    console.log('   🔧 Verify AWS resource configurations and permissions');
  }

  // Next Steps
  console.log('\n🚀 Next Steps:');
  console.log('   1. Review this report with your development team');
  console.log('   2. Address any failed test suites');
  console.log('   3. Implement monitoring based on these test patterns');
  console.log('   4. Schedule regular automated testing');
  console.log('   5. Update tests as new features are added');

  return {
    totalSuites,
    passedSuites,
    failedSuites,
    successRate: (passedSuites / totalSuites) * 100,
    totalDuration: overallResults.totalDuration
  };
}

/**
 * Main test runner
 */
async function runAWSTestSuite() {
  console.log('🚀 AWS Test Suite - Comprehensive Testing');
  console.log('=' .repeat(70));
  console.log(`📍 Target API: ${CONFIG.API_BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🔄 Execution Mode: ${CONFIG.PARALLEL_EXECUTION ? 'Parallel' : 'Sequential'}`);
  
  // List enabled test suites
  const enabledSuites = Object.entries(CONFIG.TEST_SUITES)
    .filter(([_, suite]) => suite.enabled)
    .map(([_, suite]) => suite.name);
  
  console.log(`📋 Test Suites: ${enabledSuites.join(', ')}`);
  console.log('=' .repeat(70));

  overallResults.startTime = Date.now();

  try {
    // Run tests based on configuration
    if (CONFIG.PARALLEL_EXECUTION) {
      await runParallelTests();
    } else {
      await runSequentialTests();
    }

    overallResults.endTime = Date.now();
    overallResults.totalDuration = overallResults.endTime - overallResults.startTime;

    // Generate comprehensive report
    const summary = generateOverallReport();

    console.log('\n🏁 AWS Test Suite Complete!');
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);
    console.log(`📊 Final Result: ${summary.successRate === 100 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    // Exit with appropriate code
    process.exit(summary.failedSuites === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n💥 Fatal Test Suite Error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Command line interface
 */
function handleCommandLine() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AWS Test Suite Runner

Usage: node aws-test-runner.js [options]

Options:
  --help, -h          Show this help message
  --parallel          Run test suites in parallel (faster but less detailed output)
  --sequential        Run test suites sequentially (default, more detailed output)
  --endpoints-only    Run only endpoint tests
  --lambda-only       Run only Lambda function tests
  --dynamodb-only     Run only DynamoDB integration tests

Examples:
  node aws-test-runner.js                    # Run all tests sequentially
  node aws-test-runner.js --parallel         # Run all tests in parallel
  node aws-test-runner.js --endpoints-only   # Run only endpoint tests
`);
    process.exit(0);
  }

  // Handle test suite selection
  if (args.includes('--endpoints-only')) {
    CONFIG.TEST_SUITES.lambda.enabled = false;
    CONFIG.TEST_SUITES.dynamodb.enabled = false;
  }
  
  if (args.includes('--lambda-only')) {
    CONFIG.TEST_SUITES.endpoints.enabled = false;
    CONFIG.TEST_SUITES.dynamodb.enabled = false;
  }
  
  if (args.includes('--dynamodb-only')) {
    CONFIG.TEST_SUITES.endpoints.enabled = false;
    CONFIG.TEST_SUITES.lambda.enabled = false;
  }

  // Handle execution mode
  if (args.includes('--parallel')) {
    CONFIG.PARALLEL_EXECUTION = true;
  }
  
  if (args.includes('--sequential')) {
    CONFIG.PARALLEL_EXECUTION = false;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  handleCommandLine();
  runAWSTestSuite();
}

module.exports = {
  runAWSTestSuite,
  runSequentialTests,
  runParallelTests,
  CONFIG
};
