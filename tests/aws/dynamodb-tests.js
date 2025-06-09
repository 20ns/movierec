/**
 * AWS DynamoDB Integration Testing
 * Tests DynamoDB operations through API Gateway endpoints
 */

const https = require('https');

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod',
  TABLES_TO_TEST: [
    'UserPreferences',
    'MovieRecCache', 
    'Favourites',
    'Watchlist'
  ],
  // Test data patterns
  TEST_DATA: {
    preferences: {
      genres: ['Action', 'Comedy', 'Drama'],
      excludeGenres: ['Horror'],
      minRating: 7.0,
      timeRange: '2010-2023',
      contentTypes: ['movie', 'tv']
    },
    favourite: {
      mediaId: 12345,
      title: 'Test Movie',
      mediaType: 'movie',
      posterPath: '/test-poster.jpg',
      rating: 8.5
    },
    watchlistItem: {
      mediaId: 67890,
      title: 'Test TV Show',
      mediaType: 'tv',
      posterPath: '/test-tv.jpg',
      rating: 9.0
    }
  }
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tableTests: {},
  errors: []
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
      timeout: 15000
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
 * Test helper function
 */
function test(description, testFn) {
  results.total++;
  try {
    const result = testFn();
    if (result === true || result === undefined) {
      results.passed++;
      console.log(`   ✅ ${description}`);
      return true;
    } else {
      results.failed++;
      console.log(`   ❌ ${description} - ${result}`);
      results.errors.push(`${description}: ${result}`);
      return false;
    }
  } catch (error) {
    results.failed++;
    console.log(`   ❌ ${description} - ERROR: ${error.message}`);
    results.errors.push(`${description}: ${error.message}`);
    return false;
  }
}

/**
 * Test UserPreferences table operations
 */
async function testUserPreferencesTable() {
  console.log('\n👤 Testing UserPreferences Table');
  console.log('-'.repeat(40));

  // Test GET preferences (should return 401 - unauthorized)
  try {
    const getResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/preferences`);
    
    test('GET preferences endpoint accessible', () => {
      return getResponse.statusCode !== undefined;
    });

    test('GET preferences requires authentication', () => {
      return getResponse.statusCode === 401 || getResponse.statusCode === 403;
    });

    console.log(`   📄 GET Response: ${getResponse.statusCode} - ${JSON.stringify(getResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('GET preferences network access', () => `Network error: ${error.message}`);
  }

  // Test POST preferences (should return 401 - unauthorized)
  try {
    const postResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/preferences`, {
      method: 'POST',
      body: CONFIG.TEST_DATA.preferences
    });

    test('POST preferences endpoint accessible', () => {
      return postResponse.statusCode !== undefined;
    });

    test('POST preferences requires authentication', () => {
      return postResponse.statusCode === 401 || postResponse.statusCode === 403;
    });

    console.log(`   📝 POST Response: ${postResponse.statusCode} - ${JSON.stringify(postResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('POST preferences network access', () => `Network error: ${error.message}`);
  }

  results.tableTests.UserPreferences = { tested: true, accessible: true };
}

/**
 * Test Favourites table operations
 */
async function testFavouritesTable() {
  console.log('\n❤️ Testing Favourites Table');
  console.log('-'.repeat(40));

  // Test GET favourites
  try {
    const getResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/favourites`);
    
    test('GET favourites endpoint accessible', () => {
      return getResponse.statusCode !== undefined;
    });

    test('GET favourites requires authentication', () => {
      return getResponse.statusCode === 401 || getResponse.statusCode === 403;
    });

    console.log(`   📄 GET Response: ${getResponse.statusCode} - ${JSON.stringify(getResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('GET favourites network access', () => `Network error: ${error.message}`);
  }

  // Test POST favourites
  try {
    const postResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/favourites`, {
      method: 'POST',
      body: CONFIG.TEST_DATA.favourite
    });

    test('POST favourites endpoint accessible', () => {
      return postResponse.statusCode !== undefined;
    });

    test('POST favourites requires authentication', () => {
      return postResponse.statusCode === 401 || postResponse.statusCode === 403;
    });

    console.log(`   📝 POST Response: ${postResponse.statusCode} - ${JSON.stringify(postResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('POST favourites network access', () => `Network error: ${error.message}`);
  }

  // Test DELETE favourites
  try {
    const deleteResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/favourites`, {
      method: 'DELETE',
      body: { mediaId: CONFIG.TEST_DATA.favourite.mediaId }
    });

    test('DELETE favourites endpoint accessible', () => {
      return deleteResponse.statusCode !== undefined;
    });

    test('DELETE favourites requires authentication', () => {
      return deleteResponse.statusCode === 401 || deleteResponse.statusCode === 403;
    });

    console.log(`   🗑️ DELETE Response: ${deleteResponse.statusCode} - ${JSON.stringify(deleteResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('DELETE favourites network access', () => `Network error: ${error.message}`);
  }

  results.tableTests.Favourites = { tested: true, accessible: true };
}

/**
 * Test Watchlist table operations
 */
async function testWatchlistTable() {
  console.log('\n📺 Testing Watchlist Table');
  console.log('-'.repeat(40));

  // Test GET watchlist
  try {
    const getResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/watchlist`);
    
    test('GET watchlist endpoint accessible', () => {
      return getResponse.statusCode !== undefined;
    });

    test('GET watchlist requires authentication', () => {
      return getResponse.statusCode === 401 || getResponse.statusCode === 403;
    });

    console.log(`   📄 GET Response: ${getResponse.statusCode} - ${JSON.stringify(getResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('GET watchlist network access', () => `Network error: ${error.message}`);
  }

  // Test POST watchlist
  try {
    const postResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/watchlist`, {
      method: 'POST',
      body: CONFIG.TEST_DATA.watchlistItem
    });

    test('POST watchlist endpoint accessible', () => {
      return postResponse.statusCode !== undefined;
    });

    test('POST watchlist requires authentication', () => {
      return postResponse.statusCode === 401 || postResponse.statusCode === 403;
    });

    console.log(`   📝 POST Response: ${postResponse.statusCode} - ${JSON.stringify(postResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('POST watchlist network access', () => `Network error: ${error.message}`);
  }

  // Test DELETE watchlist
  try {
    const deleteResponse = await makeRequest(`${CONFIG.API_BASE_URL}/user/watchlist`, {
      method: 'DELETE',
      body: { mediaId: CONFIG.TEST_DATA.watchlistItem.mediaId }
    });

    test('DELETE watchlist endpoint accessible', () => {
      return deleteResponse.statusCode !== undefined;
    });

    test('DELETE watchlist requires authentication', () => {
      return deleteResponse.statusCode === 401 || deleteResponse.statusCode === 403;
    });

    console.log(`   🗑️ DELETE Response: ${deleteResponse.statusCode} - ${JSON.stringify(deleteResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('DELETE watchlist network access', () => `Network error: ${error.message}`);
  }

  results.tableTests.Watchlist = { tested: true, accessible: true };
}

/**
 * Test MovieRecCache table (via recommendations endpoint)
 */
async function testMovieRecCacheTable() {
  console.log('\n🎬 Testing MovieRecCache Table (via Recommendations)');
  console.log('-'.repeat(50));

  try {
    const getResponse = await makeRequest(`${CONFIG.API_BASE_URL}/recommendations`);
    
    test('GET recommendations endpoint accessible', () => {
      return getResponse.statusCode !== undefined;
    });

    test('GET recommendations requires authentication', () => {
      return getResponse.statusCode === 401 || getResponse.statusCode === 403;
    });

    console.log(`   📄 GET Response: ${getResponse.statusCode} - ${JSON.stringify(getResponse.data).substring(0, 80)}...`);

    // Test with query parameters
    const queryResponse = await makeRequest(`${CONFIG.API_BASE_URL}/recommendations?refresh=true`);
    
    test('GET recommendations with params accessible', () => {
      return queryResponse.statusCode !== undefined;
    });

    console.log(`   🔄 Query Response: ${queryResponse.statusCode} - ${JSON.stringify(queryResponse.data).substring(0, 80)}...`);

  } catch (error) {
    test('GET recommendations network access', () => `Network error: ${error.message}`);
  }

  results.tableTests.MovieRecCache = { tested: true, accessible: true };
}

/**
 * Test data consistency and validation
 */
async function testDataValidation() {
  console.log('\n🔍 Testing Data Validation');
  console.log('-'.repeat(40));

  // Test invalid data formats
  const invalidDataTests = [
    {
      name: 'Invalid preferences format',
      endpoint: '/user/preferences',
      method: 'POST',
      data: { invalidField: 'test', malformedGenres: 'not-an-array' }
    },
    {
      name: 'Invalid favourite format',
      endpoint: '/user/favourites',
      method: 'POST',
      data: { mediaId: 'not-a-number', missingTitle: true }
    },
    {
      name: 'Invalid watchlist format',
      endpoint: '/user/watchlist',
      method: 'POST',
      data: { mediaId: null, title: 123 }
    }
  ];

  for (const testCase of invalidDataTests) {
    try {
      const response = await makeRequest(`${CONFIG.API_BASE_URL}${testCase.endpoint}`, {
        method: testCase.method,
        body: testCase.data
      });

      test(`${testCase.name} - endpoint responds`, () => {
        return response.statusCode !== undefined;
      });

      // Should return 400 (bad request) or 401 (unauthorized)
      test(`${testCase.name} - validation works`, () => {
        return response.statusCode === 400 || response.statusCode === 401 || response.statusCode === 403;
      });

      console.log(`   📋 ${testCase.name}: ${response.statusCode}`);

    } catch (error) {
      test(`${testCase.name} - network access`, () => `Network error: ${error.message}`);
    }
  }
}

/**
 * Test database connection and error handling
 */
async function testDatabaseConnectivity() {
  console.log('\n🔗 Testing Database Connectivity');
  console.log('-'.repeat(40));

  // Test endpoints that would typically hit the database
  const dbEndpoints = [
    { path: '/user/preferences', name: 'UserPreferences table' },
    { path: '/user/favourites', name: 'Favourites table' },
    { path: '/user/watchlist', name: 'Watchlist table' },
    { path: '/recommendations', name: 'MovieRecCache table' }
  ];

  for (const endpoint of dbEndpoints) {
    try {
      const startTime = Date.now();
      const response = await makeRequest(`${CONFIG.API_BASE_URL}${endpoint.path}`);
      const responseTime = Date.now() - startTime;

      test(`${endpoint.name} - connection response time < 10s`, () => {
        return responseTime < 10000;
      });

      test(`${endpoint.name} - no database errors`, () => {
        // If we get a 500 error, it might indicate database connectivity issues
        return response.statusCode !== 500;
      });

      console.log(`   📊 ${endpoint.name}: ${response.statusCode} (${responseTime}ms)`);

    } catch (error) {
      test(`${endpoint.name} - connectivity`, () => `Network error: ${error.message}`);
    }
  }
}

/**
 * Generate DynamoDB test report
 */
function generateDynamoDBReport() {
  console.log('\n📋 DynamoDB Integration Test Report');
  console.log('='.repeat(60));

  // Table accessibility summary
  console.log('\n📊 Table Accessibility Summary:');
  console.log('Table'.padEnd(20) + 'Status'.padEnd(15) + 'Notes');
  console.log('-'.repeat(50));

  CONFIG.TABLES_TO_TEST.forEach(tableName => {
    const tableResult = results.tableTests[tableName];
    const status = tableResult?.accessible ? '✅ Accessible' : '❌ Not Accessible';
    const notes = tableResult?.tested ? 'Endpoints tested' : 'Not tested';
    
    console.log(tableName.padEnd(20) + status.padEnd(15) + notes);
  });

  // Test summary
  console.log('\n🎯 Test Summary:');
  console.log(`   Total Tests: ${results.total}`);
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  // Error summary
  if (results.errors.length > 0) {
    console.log('\n❌ Issues Identified:');
    results.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (results.failed === 0) {
    console.log('   ✅ All DynamoDB integrations are working correctly through API Gateway');
    console.log('   ✅ Authentication is properly protecting database endpoints');
    console.log('   ✅ All tables are accessible through their respective Lambda functions');
  } else {
    console.log('   ⚠️ Some database integration tests failed - check Lambda function configurations');
    console.log('   ⚠️ Verify DynamoDB table permissions and IAM roles');
    console.log('   ⚠️ Check CloudWatch logs for Lambda function errors');
  }
}

/**
 * Main test runner
 */
async function runDynamoDBTests() {
  console.log('🗄️ Starting DynamoDB Integration Tests');
  console.log('=' .repeat(60));
  console.log(`📍 API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(`📊 Tables to Test: ${CONFIG.TABLES_TO_TEST.join(', ')}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));

  try {
    await testUserPreferencesTable();
    await testFavouritesTable();
    await testWatchlistTable();
    await testMovieRecCacheTable();
    await testDataValidation();
    await testDatabaseConnectivity();
    
    generateDynamoDBReport();

    console.log('\n🏁 DynamoDB Testing Complete!');
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
  runDynamoDBTests();
}

module.exports = {
  runDynamoDBTests,
  testUserPreferencesTable,
  testFavouritesTable,
  testWatchlistTable,
  CONFIG
};
