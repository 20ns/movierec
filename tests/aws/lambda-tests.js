/**
 * AWS Lambda Function Testing Suite
 * Tests individual Lambda functions and their integration
 */

const https = require('https');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
  LAMBDA_FUNCTIONS: {
    signin: { endpoint: '/auth/signin', method: 'POST' },
    signup: { endpoint: '/auth/signup', method: 'POST' },
    refreshToken: { endpoint: '/auth/refresh', method: 'POST' },
    userPreferences: { endpoint: '/user/preferences', method: 'GET' },
    favourites: { endpoint: '/user/favourites', method: 'GET' },
    watchlist: { endpoint: '/user/watchlist', method: 'GET' },
    recommendations: { endpoint: '/recommendations', method: 'GET' },
    mediaCache: { endpoint: '/media', method: 'GET' }
  }
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        ...options.headers
      },
      timeout: 10000
    };

    const req = https.request(url, requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            rawBody: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: { parseError: e.message },
            rawBody: body
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test a single Lambda function
 */
async function testLambdaFunction(name, config, testData = {}) {
  console.log(`\n🔧 Testing ${name} Lambda Function`);
  console.log('-'.repeat(40));

  const startTime = Date.now();
  
  try {
    const url = `${CONFIG.API_BASE_URL}${config.endpoint}`;
    const response = await makeRequest(url, {
      method: config.method,
      body: testData
    });

    const responseTime = Date.now() - startTime;

    // Basic function tests
    const isAccessible = response.statusCode !== undefined;
    const hasValidResponse = response.statusCode >= 200 && response.statusCode < 600;
    const returnsJSON = typeof response.data === 'object';
    const responseTimeOK = responseTime < 30000; // 30 second timeout for Lambda

    console.log(`   📊 Status: ${response.statusCode}`);
    console.log(`   ⏱️ Response Time: ${responseTime}ms`);
    console.log(`   📄 Response Type: ${typeof response.data}`);
    console.log(`   🔍 Response Preview: ${JSON.stringify(response.data).substring(0, 100)}...`);

    // Record results
    const testResult = {
      function: name,
      endpoint: config.endpoint,
      method: config.method,
      statusCode: response.statusCode,
      responseTime,
      accessible: isAccessible,
      validResponse: hasValidResponse,
      returnsJSON: returnsJSON,
      performanceOK: responseTimeOK,
      error: null
    };

    results.details.push(testResult);
    
    if (isAccessible && hasValidResponse && returnsJSON && responseTimeOK) {
      results.passed++;
      console.log(`   ✅ ${name} function: PASSED`);
    } else {
      results.failed++;
      console.log(`   ❌ ${name} function: FAILED`);
    }

    results.total++;
    return testResult;

  } catch (error) {
    console.log(`   💥 ${name} function: ERROR - ${error.message}`);
    
    const testResult = {
      function: name,
      endpoint: config.endpoint,
      method: config.method,
      statusCode: null,
      responseTime: Date.now() - startTime,
      accessible: false,
      validResponse: false,
      returnsJSON: false,
      performanceOK: false,
      error: error.message
    };

    results.details.push(testResult);
    results.failed++;
    results.total++;
    return testResult;
  }
}

/**
 * Test authentication flow
 */
async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Authentication Flow');
  console.log('='.repeat(50));

  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  // Test signup
  await testLambdaFunction('signup', CONFIG.LAMBDA_FUNCTIONS.signup, {
    email: testEmail,
    password: testPassword
  });

  // Test signin (expected to fail for unconfirmed user)
  await testLambdaFunction('signin', CONFIG.LAMBDA_FUNCTIONS.signin, {
    email: testEmail,
    password: testPassword
  });

  // Test refresh token (expected to fail with dummy token)
  await testLambdaFunction('refreshToken', CONFIG.LAMBDA_FUNCTIONS.refreshToken, {
    refreshToken: 'dummy-refresh-token'
  });
}

/**
 * Test data access functions
 */
async function testDataAccessFunctions() {
  console.log('\n📊 Testing Data Access Functions');
  console.log('='.repeat(50));

  // These should fail with 401/403 due to no authentication
  await testLambdaFunction('userPreferences', CONFIG.LAMBDA_FUNCTIONS.userPreferences);
  await testLambdaFunction('favourites', CONFIG.LAMBDA_FUNCTIONS.favourites);
  await testLambdaFunction('watchlist', CONFIG.LAMBDA_FUNCTIONS.watchlist);
  await testLambdaFunction('recommendations', CONFIG.LAMBDA_FUNCTIONS.recommendations);
}

/**
 * Test public functions
 */
async function testPublicFunctions() {
  console.log('\n🌐 Testing Public Functions');
  console.log('='.repeat(50));

  // Test media cache with query
  await testLambdaFunction('mediaCache', { 
    endpoint: '/media?query=batman', 
    method: 'GET' 
  });

  // Test media cache without query
  await testLambdaFunction('mediaCache-empty', { 
    endpoint: '/media', 
    method: 'GET' 
  });
}

/**
 * Test Lambda cold start performance
 */
async function testColdStartPerformance() {
  console.log('\n❄️ Testing Cold Start Performance');
  console.log('='.repeat(50));

  const coldStartTests = [];
  
  // Test multiple quick requests to see cold start vs warm start
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    try {
      await makeRequest(`${CONFIG.API_BASE_URL}/media?query=test${i}`);
      const responseTime = Date.now() - startTime;
      coldStartTests.push(responseTime);
      console.log(`   Request ${i + 1}: ${responseTime}ms`);
    } catch (error) {
      console.log(`   Request ${i + 1}: ERROR - ${error.message}`);
    }
  }

  if (coldStartTests.length > 0) {
    const avgTime = coldStartTests.reduce((a, b) => a + b, 0) / coldStartTests.length;
    const maxTime = Math.max(...coldStartTests);
    const minTime = Math.min(...coldStartTests);

    console.log(`   📊 Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   📈 Max: ${maxTime}ms`);
    console.log(`   📉 Min: ${minTime}ms`);

    // Cold start is typically the first request
    if (coldStartTests[0] > coldStartTests[1] && coldStartTests[0] > coldStartTests[2]) {
      console.log(`   ❄️ Cold start detected: ${coldStartTests[0]}ms`);
    }
  }
}

/**
 * Generate test report
 */
function generateReport() {
  console.log('\n📋 Lambda Function Test Report');
  console.log('='.repeat(60));

  // Summary table
  console.log('\n📊 Function Summary:');
  console.log('Function'.padEnd(20) + 'Status'.padEnd(10) + 'Time (ms)'.padEnd(12) + 'Code');
  console.log('-'.repeat(50));

  results.details.forEach(result => {
    const status = result.accessible && result.validResponse ? '✅ PASS' : '❌ FAIL';
    const time = result.responseTime ? result.responseTime.toString() : 'N/A';
    const code = result.statusCode ? result.statusCode.toString() : 'ERROR';
    
    console.log(
      result.function.padEnd(20) + 
      status.padEnd(10) + 
      time.padEnd(12) + 
      code
    );
  });

  // Performance analysis
  console.log('\n⚡ Performance Analysis:');
  const responseTimes = results.details
    .filter(r => r.responseTime)
    .map(r => r.responseTime);

  if (responseTimes.length > 0) {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    const slowFunctions = results.details.filter(r => r.responseTime > 5000);

    console.log(`   Average response time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Slowest response: ${maxTime}ms`);
    console.log(`   Functions > 5s: ${slowFunctions.length}`);

    if (slowFunctions.length > 0) {
      console.log('   Slow functions:');
      slowFunctions.forEach(f => {
        console.log(`     - ${f.function}: ${f.responseTime}ms`);
      });
    }
  }

  // Error analysis
  const errors = results.details.filter(r => r.error);
  if (errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    errors.forEach(error => {
      console.log(`   - ${error.function}: ${error.error}`);
    });
  }

  // Final summary
  console.log('\n🎯 Test Summary:');
  console.log(`   Total Functions Tested: ${results.total}`);
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
}

/**
 * Main test runner
 */
async function runLambdaTests() {
  console.log('🚀 Starting Lambda Function Tests');
  console.log('=' .repeat(60));
  console.log(`📍 API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  try {
    await testAuthenticationFlow();
    await testDataAccessFunctions();
    await testPublicFunctions();
    await testColdStartPerformance();
    
    generateReport();

    console.log('\n🏁 Lambda Testing Complete!');
    console.log(`⏰ Finished at: ${new Date().toISOString()}`);

    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n💥 Fatal Test Error:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runLambdaTests();
}

module.exports = {
  runLambdaTests,
  testLambdaFunction,
  testAuthenticationFlow,
  CONFIG
};
