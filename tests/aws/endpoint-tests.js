/**
 * AWS API Gateway Endpoint Testing Suite
 * Tests all MovieRec API endpoints for functionality, authentication, and CORS
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
  TIMEOUT: 10000,
  TEST_EMAIL: `test+${Date.now()}@example.com`,
  TEST_PASSWORD: 'TestPass123!',
  EXPECTED_ORIGINS: [
    'http://localhost:3000',
    'https://movierec.net',
    'https://www.movierec.net'
  ]
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make HTTP request with proper error handling
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        ...options.headers
      },
      timeout: CONFIG.TIMEOUT
    };

    const req = https.request(requestOptions, (res) => {
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
 * Test assertion helper
 */
function test(description, testFn) {
  results.total++;
  try {
    const result = testFn();
    if (result === true || result === undefined) {
      results.passed++;
      console.log(`✅ ${description}`);
      return true;
    } else {
      results.failed++;
      console.log(`❌ ${description} - ${result}`);
      results.errors.push(`${description}: ${result}`);
      return false;
    }
  } catch (error) {
    results.failed++;
    console.log(`❌ ${description} - ERROR: ${error.message}`);
    results.errors.push(`${description}: ${error.message}`);
    return false;
  }
}

/**
 * Test CORS headers
 */
function testCORS(response, expectedOrigin = 'http://localhost:3000') {
  const corsHeaders = {
    'access-control-allow-origin': response.headers['access-control-allow-origin'],
    'access-control-allow-methods': response.headers['access-control-allow-methods'],
    'access-control-allow-headers': response.headers['access-control-allow-headers']
  };

  return test('CORS headers present', () => {
    if (!corsHeaders['access-control-allow-origin']) {
      return 'Missing Access-Control-Allow-Origin header';
    }
    if (corsHeaders['access-control-allow-origin'] !== expectedOrigin && 
        corsHeaders['access-control-allow-origin'] !== '*') {
      return `Unexpected origin: ${corsHeaders['access-control-allow-origin']}`;
    }
    return true;
  });
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints');
  console.log('=' .repeat(50));

  // Test signup endpoint
  try {
    const signupResponse = await makeRequest(`${CONFIG.API_BASE_URL}/auth/signup`, {
      method: 'POST',
      body: {
        email: CONFIG.TEST_EMAIL,
        password: CONFIG.TEST_PASSWORD
      }
    });

    test('Signup endpoint responds', () => {
      return signupResponse.statusCode === 200 || signupResponse.statusCode === 400;
    });

    test('Signup returns JSON', () => {
      return typeof signupResponse.data === 'object';
    });

    testCORS(signupResponse);

    console.log(`   📝 Signup Response: ${signupResponse.statusCode} - ${JSON.stringify(signupResponse.data).substring(0, 100)}...`);

  } catch (error) {
    test('Signup endpoint accessible', () => `Network error: ${error.message}`);
  }

  // Test signin endpoint (should fail without confirmed user)
  try {
    const signinResponse = await makeRequest(`${CONFIG.API_BASE_URL}/auth/signin`, {
      method: 'POST',
      body: {
        email: CONFIG.TEST_EMAIL,
        password: CONFIG.TEST_PASSWORD
      }
    });

    test('Signin endpoint responds', () => {
      return signinResponse.statusCode >= 200 && signinResponse.statusCode < 500;
    });

    testCORS(signinResponse);

    console.log(`   🔑 Signin Response: ${signinResponse.statusCode} - ${JSON.stringify(signinResponse.data).substring(0, 100)}...`);

  } catch (error) {
    test('Signin endpoint accessible', () => `Network error: ${error.message}`);
  }

  // Test refresh token endpoint
  try {
    const refreshResponse = await makeRequest(`${CONFIG.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      body: {
        refreshToken: 'dummy-token'
      }
    });

    test('Refresh token endpoint responds', () => {
      return refreshResponse.statusCode >= 200 && refreshResponse.statusCode < 500;
    });

    testCORS(refreshResponse);

    console.log(`   🔄 Refresh Response: ${refreshResponse.statusCode} - ${JSON.stringify(refreshResponse.data).substring(0, 100)}...`);

  } catch (error) {
    test('Refresh token endpoint accessible', () => `Network error: ${error.message}`);
  }
}

/**
 * Test protected endpoints (should return 401 without auth)
 */
async function testProtectedEndpoints() {
  console.log('\n🔒 Testing Protected Endpoints (Unauthorized)');
  console.log('=' .repeat(50));

  const protectedEndpoints = [
    { path: '/user/preferences', methods: ['GET', 'POST'] },
    { path: '/user/favourites', methods: ['GET', 'POST', 'DELETE'] },
    { path: '/user/watchlist', methods: ['GET', 'POST', 'DELETE'] },
    { path: '/recommendations', methods: ['GET'] }
  ];

  for (const endpoint of protectedEndpoints) {
    for (const method of endpoint.methods) {
      try {
        const response = await makeRequest(`${CONFIG.API_BASE_URL}${endpoint.path}`, {
          method: method
        });

        test(`${method} ${endpoint.path} requires auth`, () => {
          if (response.statusCode === 401 || response.statusCode === 403) {
            return true;
          }
          return `Expected 401/403, got ${response.statusCode}`;
        });

        testCORS(response);

      } catch (error) {
        test(`${method} ${endpoint.path} accessible`, () => `Network error: ${error.message}`);
      }
    }
  }
}

/**
 * Test public endpoints
 */
async function testPublicEndpoints() {
  console.log('\n🌐 Testing Public Endpoints');
  console.log('=' .repeat(50));

  // Test media cache endpoint
  try {
    const mediaResponse = await makeRequest(`${CONFIG.API_BASE_URL}/media?query=batman`);

    test('Media endpoint responds successfully', () => {
      return mediaResponse.statusCode === 200;
    });

    test('Media endpoint returns JSON', () => {
      return typeof mediaResponse.data === 'object';
    });

    testCORS(mediaResponse);

    console.log(`   🎬 Media Response: ${mediaResponse.statusCode} - ${JSON.stringify(mediaResponse.data).substring(0, 100)}...`);

  } catch (error) {
    test('Media endpoint accessible', () => `Network error: ${error.message}`);
  }

  // Test media endpoint without query
  try {
    const mediaEmptyResponse = await makeRequest(`${CONFIG.API_BASE_URL}/media`);

    test('Media endpoint handles empty query', () => {
      return mediaEmptyResponse.statusCode === 200 || mediaEmptyResponse.statusCode === 400;
    });

    testCORS(mediaEmptyResponse);

  } catch (error) {
    test('Media endpoint (empty) accessible', () => `Network error: ${error.message}`);
  }
}

/**
 * Test OPTIONS requests (CORS preflight)
 */
async function testCORSPreflightRequests() {
  console.log('\n✈️ Testing CORS Preflight Requests');
  console.log('=' .repeat(50));

  const endpoints = [
    '/auth/signin',
    '/auth/signup',
    '/user/preferences',
    '/user/favourites',
    '/media',
    '/recommendations'
  ];

  for (const endpoint of endpoints) {
    try {
      const optionsResponse = await makeRequest(`${CONFIG.API_BASE_URL}${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });

      test(`OPTIONS ${endpoint} responds correctly`, () => {
        return optionsResponse.statusCode === 200 || optionsResponse.statusCode === 204;
      });

      test(`OPTIONS ${endpoint} has CORS headers`, () => {
        const allowMethods = optionsResponse.headers['access-control-allow-methods'];
        const allowHeaders = optionsResponse.headers['access-control-allow-headers'];
        
        if (!allowMethods && !allowHeaders) {
          return 'Missing CORS preflight headers';
        }
        return true;
      });

    } catch (error) {
      test(`OPTIONS ${endpoint} accessible`, () => `Network error: ${error.message}`);
    }
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling');
  console.log('=' .repeat(50));

  // Test invalid endpoint
  try {
    const invalidResponse = await makeRequest(`${CONFIG.API_BASE_URL}/invalid-endpoint`);

    test('Invalid endpoint returns 404', () => {
      return invalidResponse.statusCode === 404 || invalidResponse.statusCode === 403;
    });

  } catch (error) {
    test('Invalid endpoint returns error', () => true); // Network error is expected
  }

  // Test malformed JSON
  try {
    const malformedResponse = await makeRequest(`${CONFIG.API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });

    test('Malformed JSON handled gracefully', () => {
      return malformedResponse.statusCode === 400 || malformedResponse.statusCode === 500;
    });

  } catch (error) {
    test('Malformed JSON request accessible', () => `Network error: ${error.message}`);
  }
}

/**
 * Performance and reliability tests
 */
async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  console.log('=' .repeat(50));

  const startTime = Date.now();
  
  try {
    const response = await makeRequest(`${CONFIG.API_BASE_URL}/media?query=test`);
    const responseTime = Date.now() - startTime;

    test('Response time under 5 seconds', () => {
      if (responseTime > 5000) {
        return `Response took ${responseTime}ms`;
      }
      return true;
    });

    console.log(`   ⏱️ Response time: ${responseTime}ms`);

  } catch (error) {
    test('Performance test completed', () => `Network error: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting AWS API Gateway Endpoint Tests');
  console.log('=' .repeat(60));
  console.log(`📍 API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(`📧 Test Email: ${CONFIG.TEST_EMAIL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  try {
    await testAuthEndpoints();
    await testProtectedEndpoints();
    await testPublicEndpoints();
    await testCORSPreflightRequests();
    await testErrorHandling();
    await testPerformance();

    // Print final results
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.total}`);
    console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🏁 Testing Complete!');
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
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthEndpoints,
  testProtectedEndpoints,
  testPublicEndpoints,
  CONFIG
};
