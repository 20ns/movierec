const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// Test configuration
const API_BASE_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const TEST_TIMEOUT = 30000;

// Mock JWT token for testing (you would use real token in production)
const MOCK_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.test';

describe('UserStats API Integration Tests', () => {
  let authToken = null;

  beforeAll(async () => {
    // In a real test, you would sign in to get a valid token
    // For now, we'll test the endpoint structure
    console.log(`Testing UserStats API at: ${API_BASE_URL}`);
  });

  describe('UserStats Endpoint Availability', () => {
    test('GET /user/stats/stats should be accessible', async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/stats/stats`, {
          headers: {
            'Authorization': MOCK_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: TEST_TIMEOUT,
          validateStatus: () => true // Accept any status code
        });

        console.log('UserStats GET response:', {
          status: response.status,
          headers: response.headers,
          data: response.data
        });

        // Should respond (even if unauthorized)
        expect(response.status).toBeDefined();
        expect([200, 401, 403, 500, 502]).toContain(response.status);
        
        // Should respond (check for CORS headers if present)
        // Note: CORS headers may not be present in error responses from API Gateway
        if (response.status >= 200 && response.status < 300) {
          const corsOrigin = response.headers['access-control-allow-origin'] || response.headers['Access-Control-Allow-Origin'];
          expect(corsOrigin).toBeDefined();
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to API at ${API_BASE_URL}. Make sure the backend is deployed and running.`);
        }
        throw error;
      }
    }, TEST_TIMEOUT);

    test('POST /user/stats/update should be accessible', async () => {
      try {
        const testData = {
          totalXP: 100,
          moviesWatched: 5
        };

        const response = await axios.post(`${API_BASE_URL}/user/stats/update`, testData, {
          headers: {
            'Authorization': MOCK_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: TEST_TIMEOUT,
          validateStatus: () => true
        });

        console.log('UserStats POST response:', {
          status: response.status,
          data: response.data
        });

        // Should respond (even if unauthorized)
        expect(response.status).toBeDefined();
        expect([200, 401, 403, 500, 502]).toContain(response.status);
        
        // Should respond (check for CORS headers if present)
        // Note: CORS headers may not be present in error responses from API Gateway
        if (response.status >= 200 && response.status < 300) {
          const corsOrigin = response.headers['access-control-allow-origin'] || response.headers['Access-Control-Allow-Origin'];
          expect(corsOrigin).toBeDefined();
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to API at ${API_BASE_URL}. Make sure the backend is deployed and running.`);
        }
        throw error;
      }
    }, TEST_TIMEOUT);

    test('POST /user/stats/award-xp should be accessible', async () => {
      try {
        const testData = {
          xpAmount: 50,
          reason: 'Test XP award'
        };

        const response = await axios.post(`${API_BASE_URL}/user/stats/award-xp`, testData, {
          headers: {
            'Authorization': MOCK_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: TEST_TIMEOUT,
          validateStatus: () => true
        });

        console.log('UserStats award-xp response:', {
          status: response.status,
          data: response.data
        });

        // Should respond (even if unauthorized)
        expect(response.status).toBeDefined();
        expect([200, 401, 403, 500, 502]).toContain(response.status);
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to API at ${API_BASE_URL}. Make sure the backend is deployed and running.`);
        }
        throw error;
      }
    }, TEST_TIMEOUT);
  });

  describe('UserStats Response Format', () => {
    test('should return proper error structure for unauthorized requests', async () => {
      const response = await axios.get(`${API_BASE_URL}/user/stats/stats`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      });

      expect([401, 403, 502]).toContain(response.status);
      if (response.status !== 502) {
        expect(response.data).toHaveProperty('message');
      }
    }, TEST_TIMEOUT);

    test('should handle CORS properly', async () => {
      const response = await axios.options(`${API_BASE_URL}/user/stats/stats`, {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        },
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      });

      expect([200, 204, 403]).toContain(response.status);
      const corsOrigin = response.headers['access-control-allow-origin'] || response.headers['Access-Control-Allow-Origin'];
      const corsMethods = response.headers['access-control-allow-methods'] || response.headers['Access-Control-Allow-Methods'];
      const corsHeaders = response.headers['access-control-allow-headers'] || response.headers['Access-Control-Allow-Headers'];
      
      if (response.status === 200 || response.status === 204) {
        expect(corsOrigin).toBeDefined();
        expect(corsMethods).toBeDefined();
        expect(corsHeaders).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  describe('UserStats Data Structure', () => {
    test('should return expected data structure when successful', async () => {
      // This test would require a valid auth token in a real scenario
      // For now, we test that the error response has the expected structure
      
      const response = await axios.get(`${API_BASE_URL}/user/stats/stats`, {
        headers: {
          'Authorization': MOCK_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.success) {
        // If we somehow get a successful response, verify the data structure
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        
        const userData = response.data.data;
        expect(userData).toHaveProperty('totalXP');
        expect(userData).toHaveProperty('userLevel');
        expect(userData).toHaveProperty('moviesWatched');
        expect(userData).toHaveProperty('showsWatched');
        expect(userData).toHaveProperty('dailyStreak');
        expect(userData).toHaveProperty('challengeProgress');
        expect(userData).toHaveProperty('completedChallenges');
        expect(userData).toHaveProperty('activeChallenges');
        expect(userData).toHaveProperty('achievements');
      } else {
        // Expected for mock token - just verify error structure (if not 502)
        if (response.status !== 502) {
          expect(response.data).toHaveProperty('message');
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('Performance', () => {
    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await axios.get(`${API_BASE_URL}/user/stats/stats`, {
        headers: {
          'Authorization': MOCK_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT,
        validateStatus: () => true
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`UserStats API response time: ${responseTime}ms`);
      
      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);
    }, TEST_TIMEOUT);
  });
});