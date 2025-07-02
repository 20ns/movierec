const axios = require('axios');
require('dotenv').config();

// Test configuration
const BASE_URL = process.env.REACT_APP_API_GATEWAY_INVOKE_URL || 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const API_ENDPOINTS = {
  signin: '/auth/signin',
  signup: '/auth/signup',
  refresh: '/auth/refresh',
  preferences: '/user/preferences',
  favourites: '/user/favourites',
  watchlist: '/user/watchlist',
  recommendations: '/recommendations',
  media: '/media'
};

// Configure axios defaults
axios.defaults.timeout = 10000;
axios.defaults.validateStatus = () => true; // Don't throw on HTTP error status codes

// Mock test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  preferences: {
    genres: ['Action', 'Comedy'],
    platforms: ['Netflix', 'Amazon Prime']
  }
};

const testMovie = {
  movieId: '12345',
  title: 'Test Movie',
  genre: 'Action'
};

describe('MovieRec API Integration Tests', () => {
  beforeAll(async () => {
    // Wait for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Testing against: ${BASE_URL}`);
  });

  describe('Health Check', () => {
    test('should connect to the API server', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.media}`);
      
      // Should get a response (not network error)
      expect(response.status).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /auth/signup - should handle signup request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.signup}`, {
        email: testUser.email,
        password: testUser.password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Should return a valid HTTP response (success or error)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      
      // Should have proper CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('POST /auth/signin - should handle signin request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.signin}`, {
        email: testUser.email,
        password: testUser.password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Should return 400 for non-existent user
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toContain('User does not exist');
      
      // Should have proper CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('POST /auth/refresh - should handle token refresh request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.refresh}`, {
        refreshToken: 'mock-refresh-token'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Should return an error for invalid token
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('User Preferences Endpoints', () => {
    test('GET /user/preferences - should handle get preferences request', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.preferences}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });

    test('POST /user/preferences - should handle update preferences request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.preferences}`, 
        testUser.preferences,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });
  });

  describe('Favourites Endpoints', () => {
    test('GET /user/favourites - should handle get favourites request', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.favourites}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });

    test('POST /user/favourites - should handle add to favourites request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.favourites}`, 
        testMovie,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });

    test('DELETE /user/favourites - should handle remove from favourites request', async () => {
      const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.favourites}`, {
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        data: { movieId: testMovie.movieId }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });
  });

  describe('Watchlist Endpoints', () => {
    test('GET /user/watchlist - should handle get watchlist request', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.watchlist}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });

    test('POST /user/watchlist - should handle add to watchlist request', async () => {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.watchlist}`, 
        testMovie,
        {
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });

    test('DELETE /user/watchlist - should handle remove from watchlist request', async () => {
      const response = await axios.delete(`${BASE_URL}${API_ENDPOINTS.watchlist}`, {
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json'
        },
        data: { movieId: testMovie.movieId }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });
  });

  describe('Recommendations Endpoint', () => {
    test('GET /recommendations - should handle get recommendations request', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.recommendations}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      
      // Should return 401 unauthorized for invalid token
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Unauthorized');
    });
  });

  describe('Media Cache Endpoint', () => {
    test('GET /media - should handle get media request', async () => {
      const response = await axios.get(`${BASE_URL}${API_ENDPOINTS.media}`);
      
      // Should return 200 and proper response for public endpoint
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('API Response Structure', () => {
    test('should return JSON responses with proper CORS headers', async () => {
      // Test CORS preflight
      const corsResponse = await axios.options(`${BASE_URL}${API_ENDPOINTS.signin}`, {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      expect(corsResponse.status).toBe(204);
      expect(corsResponse.headers['access-control-allow-origin']).toBeDefined();
      expect(corsResponse.headers['access-control-allow-methods']).toBeDefined();
      expect(corsResponse.headers['access-control-allow-headers']).toBeDefined();
    });
  });
});