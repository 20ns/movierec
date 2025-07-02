// Test CORS configuration with credentials
const https = require('https');

const testCorsRequest = (endpoint, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Origin': 'http://localhost:3000',
        'Authorization': 'Bearer dummy-token-for-test',
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': 'authorization,content-type',
        'Access-Control-Request-Method': method
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`\n=== Testing ${method} ${endpoint} ===`);
      console.log('Status:', res.statusCode);
      console.log('Headers:');
      Object.keys(res.headers).forEach(key => {
        if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('origin')) {
          console.log(`  ${key}: ${res.headers[key]}`);
        }
      });
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', parsed);
        } catch (e) {
          console.log('Raw Response:', data);
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing CORS Configuration...\n');
  
  try {
    // Test OPTIONS preflight
    await testCorsRequest('/user/favourites', 'OPTIONS');
    await testCorsRequest('/user/watchlist', 'OPTIONS');
    
    // Test actual GET requests (will return 401 but should have CORS headers)
    await testCorsRequest('/user/favourites', 'GET');
    await testCorsRequest('/user/watchlist', 'GET');
    
    console.log('\n✅ CORS tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();