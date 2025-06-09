#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Tests the new CDK-deployed API Gateway endpoints
 */

const https = require('https');

const NEW_API_URL = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}: ${url}`);
  try {
    const response = await makeRequest(url, options);
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.headers['access-control-allow-origin']) {
      console.log(`✅ CORS: ${response.headers['access-control-allow-origin']}`);
    }
    
    // Try to parse response body
    if (response.body) {
      try {
        const parsed = JSON.parse(response.body);
        console.log(`✅ Response: ${JSON.stringify(parsed).substring(0, 100)}...`);
      } catch (e) {
        console.log(`✅ Response: ${response.body.substring(0, 100)}...`);
      }
    }
    
    return response;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing New CDK API Gateway Endpoints');
  console.log('==========================================');
  
  // Test public endpoints
  await testEndpoint(
    'Media Endpoint (Public)', 
    `${NEW_API_URL}/media?mediaType=movie&limit=2`
  );
  
  await testEndpoint(
    'CORS Preflight - Media', 
    `${NEW_API_URL}/media`,
    {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    }
  );
  
  // Test protected endpoints (should return 401)
  await testEndpoint(
    'Recommendations (Protected - should be 401)', 
    `${NEW_API_URL}/recommendations?mediaType=movie&limit=2`
  );
  
  await testEndpoint(
    'User Preferences (Protected - should be 401)', 
    `${NEW_API_URL}/user/preferences`
  );
  
  await testEndpoint(
    'User Favourites (Protected - should be 401)', 
    `${NEW_API_URL}/user/favourites`
  );
  
  await testEndpoint(
    'User Watchlist (Protected - should be 401)', 
    `${NEW_API_URL}/user/watchlist`
  );
  
  // Test auth endpoints
  await testEndpoint(
    'Auth Refresh Endpoint', 
    `${NEW_API_URL}/auth/refresh`,
    {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    }
  );
  
  console.log('\n✨ Test Summary:');
  console.log('- Public endpoints should return 200');
  console.log('- Protected endpoints should return 401 (Unauthorized)');  
  console.log('- All endpoints should have proper CORS headers');
  console.log('- Your frontend is now configured to use the new API Gateway!');
  console.log('\n📍 Next Steps:');
  console.log('1. Test the frontend functionality by signing in');
  console.log('2. Verify that recommendations, favorites, and watchlist work');
  console.log('3. Once everything is working, you can decommission the old API Gateway');
}

runTests().catch(console.error);
