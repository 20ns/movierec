/**
 * Load Testing Suite
 * Tests API performance under various load conditions
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const TEST_CONFIG = {
  concurrent_users: [1, 2, 3], // Reduced for free tier
  endpoints: [
    { path: '/health', method: 'GET', auth: false },
    { path: '/recommendations', method: 'GET', auth: true }
  ],
  duration_seconds: 10, // Reduced duration to minimize API calls
  acceptable_response_time: 5000, // 5 seconds
  error_rate_threshold: 0.05 // 5% error rate
};

class LoadTester {
  constructor() {
    this.results = {};
    this.authToken = null;
  }

  async authenticate() {
    // Use the same auth method as instant-test.js
    const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: 'eu-north-1' });
    const command = new InitiateAuthCommand({
      ClientId: '4gob38of1s9tu7h9ciik5unjrl',
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: 'test@gmail.com',
        PASSWORD: 'TestPass123!'
      }
    });

    try {
      const result = await cognitoClient.send(command);
      this.authToken = result.AuthenticationResult.AccessToken;
      return true;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return false;
    }
  }

  async makeRequest(endpoint, headers = {}) {
    const start = performance.now();
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE}${endpoint.path}`,
        headers: {
          ...headers,
          ...(endpoint.auth && this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
        },
        timeout: 10000
      });
      
      const end = performance.now();
      return {
        success: true,
        responseTime: end - start,
        status: response.status,
        size: JSON.stringify(response.data).length
      };
    } catch (error) {
      const end = performance.now();
      return {
        success: false,
        responseTime: end - start,
        error: error.message,
        status: error.response?.status || 0
      };
    }
  }

  async runConcurrentTest(users, endpoint, duration) {
    console.log(`🧪 Testing ${endpoint.path} with ${users} concurrent users for ${duration}s`);
    
    const results = [];
    const startTime = Date.now();
    
    // Create array of promises for concurrent users
    const userPromises = Array(users).fill().map(async (_, userIndex) => {
      const userResults = [];
      
      while (Date.now() - startTime < duration * 1000) {
        const result = await this.makeRequest(endpoint);
        userResults.push({
          ...result,
          timestamp: Date.now(),
          userId: userIndex
        });
        
        // Small delay between requests to simulate real user behavior
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return userResults;
    });

    // Wait for all users to complete
    const allResults = await Promise.all(userPromises);
    
    // Flatten results
    allResults.forEach(userResults => {
      results.push(...userResults);
    });

    return this.analyzeResults(results, users, endpoint);
  }

  analyzeResults(results, users, endpoint) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const responseTimes = successful.map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const p95ResponseTime = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]
      : 0;

    const errorRate = results.length > 0 ? failed.length / results.length : 0;
    const throughput = results.length / TEST_CONFIG.duration_seconds;

    const analysis = {
      endpoint: endpoint.path,
      concurrentUsers: users,
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: (errorRate * 100).toFixed(2) + '%',
      avgResponseTime: Math.round(avgResponseTime) + 'ms',
      p95ResponseTime: Math.round(p95ResponseTime) + 'ms',
      throughput: throughput.toFixed(2) + ' req/s',
      status: this.getTestStatus(avgResponseTime, errorRate)
    };

    return analysis;
  }

  getTestStatus(avgResponseTime, errorRate) {
    if (avgResponseTime > TEST_CONFIG.acceptable_response_time) {
      return '❌ FAIL - Response time too high';
    }
    if (errorRate > TEST_CONFIG.error_rate_threshold) {
      return '❌ FAIL - Error rate too high';
    }
    if (avgResponseTime > TEST_CONFIG.acceptable_response_time * 0.8) {
      return '⚠️ WARN - Response time approaching limit';
    }
    return '✅ PASS';
  }

  async runLoadTest() {
    console.log('🚀 Starting Load Testing Suite');
    console.log('=====================================\n');

    // Authenticate first
    if (!(await this.authenticate())) {
      console.error('❌ Failed to authenticate - skipping auth-required tests');
    }

    const allResults = [];

    for (const endpoint of TEST_CONFIG.endpoints) {
      // Skip auth-required endpoints if no token
      if (endpoint.auth && !this.authToken) {
        console.log(`⏭️ Skipping ${endpoint.path} - requires authentication`);
        continue;
      }

      console.log(`\n🎯 Testing endpoint: ${endpoint.path}`);
      console.log('-'.repeat(50));

      for (const users of TEST_CONFIG.concurrent_users) {
        const result = await this.runConcurrentTest(users, endpoint, TEST_CONFIG.duration_seconds);
        allResults.push(result);
        
        console.log(`Users: ${users.toString().padStart(2)} | ` +
                   `Avg: ${result.avgResponseTime.padStart(8)} | ` +
                   `P95: ${result.p95ResponseTime.padStart(8)} | ` +
                   `Error Rate: ${result.errorRate.padStart(6)} | ` +
                   `${result.status}`);
      }
    }

    this.printSummary(allResults);
  }

  printSummary(results) {
    console.log('\n📊 Load Test Summary');
    console.log('====================');
    
    const passed = results.filter(r => r.status.includes('✅')).length;
    const warnings = results.filter(r => r.status.includes('⚠️')).length;
    const failed = results.filter(r => r.status.includes('❌')).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n🚨 Failed Tests:');
      results.filter(r => r.status.includes('❌')).forEach(r => {
        console.log(`  - ${r.endpoint} (${r.concurrentUsers} users): ${r.status}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Consider implementing caching for slow endpoints');
      console.log('  - Review Lambda memory allocation and timeout settings');
      console.log('  - Consider API Gateway throttling configuration');
    } else {
      console.log('  - API performance is within acceptable limits');
      console.log('  - Consider monitoring these metrics in production');
    }
  }
}

// Run load test if called directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.runLoadTest().catch(console.error);
}

module.exports = LoadTester;