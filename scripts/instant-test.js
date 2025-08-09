#!/usr/bin/env node
/**
 * Instant MovieRec API Tester
 * 
 * No setup required! This script uses a pre-configured test account
 * and automatically handles authentication.
 * 
 * Usage:
 *   npm run test:instant                    # Run all tests
 *   npm run test:instant recommendations    # Test specific endpoint
 */

const axios = require('axios');
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const API_BASE = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const COGNITO_CONFIG = {
  userPoolId: 'eu-north-1_x2FwI0mFK',
  clientId: '4gob38of1s9tu7h9ciik5unjrl',
  region: 'eu-north-1'
};

// Built-in test account - no setup required!
const TEST_ACCOUNT = {
  email: 'test@gmail.com',
  password: 'TestPass123!'
};

class InstantTester {
  constructor() {
    this.baseUrl = API_BASE;
    this.token = null;
    this.passed = 0;
    this.failed = 0;
    this.cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_CONFIG.region });
  }

  // Get JWT token automatically
  async getToken() {
    try {
      console.log('🔐 Authenticating with test account...');
      
      const command = new InitiateAuthCommand({
        ClientId: COGNITO_CONFIG.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: TEST_ACCOUNT.email,
          PASSWORD: TEST_ACCOUNT.password
        }
      });

      const response = await this.cognitoClient.send(command);
      
      if (response.AuthenticationResult?.AccessToken) {
        console.log('✅ Authentication successful\n');
        return response.AuthenticationResult.AccessToken;
      }
      
      throw new Error('No access token received');
      
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      return null;
    }
  }

  // Initialize 
  async initialize() {
    console.log('🚀 MovieRec Instant Tester\n');
    
    this.token = await this.getToken();
    if (!this.token) {
      console.log('💡 If authentication fails, the test account may need recreation.');
      return false;
    }
    
    return true;
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      };

      if (data && ['POST', 'PUT'].includes(method.toUpperCase())) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || { error: error.message }
      };
    }
  }

  log(name, result, extra = '') {
    const icon = result.success ? '✅' : '❌';
    const status = result.status || 'ERR';
    console.log(`${icon} ${name} [${status}] ${extra}`);
    
    if (!result.success && result.data) {
      const errorMsg = result.data.error || JSON.stringify(result.data);
      console.log(`   ${errorMsg}`);
    }

    result.success ? this.passed++ : this.failed++;
    return result;
  }

  async testHealth() {
    console.log('🏥 Testing Health...');
    const result = await this.request('GET', '/health');
    return this.log('Health Check', result);
  }

  async testPreferences() {
    console.log('👤 Testing User Preferences...');
    
    // Get current preferences
    let result = await this.request('GET', '/user/preferences');
    this.log('Get Preferences', result);

    // Set test preferences
    const prefs = {
      genreRatings: { 
        "28": 9,    // Action
        "35": 8,    // Comedy  
        "18": 7,    // Drama
        "878": 10   // Sci-Fi
      },
      contentDiscoveryPreference: ["trending", "hiddenGems"],
      runtimePreference: "medium",
      internationalContentPreference: "veryOpen",
      favoriteContent: "The Matrix, Inception, Blade Runner",
      dealBreakers: []
    };

    result = await this.request('POST', '/user/preferences', prefs);
    return this.log('Set Preferences', result, `${Object.keys(prefs).length} fields`);
  }

  async testFavorites() {
    console.log('⭐ Testing Favorites...');
    
    // Get favorites
    let result = await this.request('GET', '/user/favourites');
    this.log('Get Favorites', result, `${result.data?.items?.length || 0} items`);

    // Add test movie
    const testMovie = {
      mediaId: "550",
      title: "Fight Club",
      mediaType: "movie", 
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      release_date: "1999-10-15",
      vote_average: 8.4
    };

    result = await this.request('POST', '/user/favourites', testMovie);
    this.log('Add to Favorites', result, testMovie.title);

    // Clean up
    await this.request('DELETE', `/user/favourites?mediaId=${testMovie.mediaId}`);
    
    return result;
  }

  async testWatchlist() {
    console.log('📺 Testing Watchlist...');
    
    // Get watchlist
    let result = await this.request('GET', '/user/watchlist');
    this.log('Get Watchlist', result, `${result.data?.items?.length || 0} items`);

    // Add test show
    const testShow = {
      mediaId: "1399",
      title: "Game of Thrones",
      mediaType: "tv",
      poster_path: "/7WUHnWGx5OO145IRxPDUkQSh4C7.jpg",
      release_date: "2011-04-17", 
      vote_average: 9.2
    };

    result = await this.request('POST', '/user/watchlist', testShow);
    this.log('Add to Watchlist', result, testShow.title);

    // Clean up
    await this.request('DELETE', `/user/watchlist?mediaId=${testShow.mediaId}`);
    
    return result;
  }

  async testRecommendations() {
    console.log('🎯 Testing Recommendations...');
    
    const testCases = [
      { params: 'mediaType=movie&limit=3', name: 'Movie Recs' },
      { params: 'mediaType=tv&limit=3', name: 'TV Recs' },  
      { params: 'mediaType=both&limit=6', name: 'Mixed Recs' }
    ];

    for (const test of testCases) {
      const result = await this.request('GET', `/recommendations?${test.params}`);
      const count = result.data?.items?.length || 0;
      const processingTime = result.data?.items?.[0]?.processingTime;
      const timeInfo = processingTime ? `${Math.round(processingTime/1000)}s` : '';
      this.log(test.name, result, `${count} items ${timeInfo}`);
    }
  }

  async runAll() {
    if (!(await this.initialize())) return;
    
    console.log(`🧪 Running All Tests - ${new Date().toLocaleString()}\n`);
    
    await this.testHealth();
    await this.testPreferences();
    await this.testFavorites();
    await this.testWatchlist(); 
    await this.testRecommendations();

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed - check output above');
    }
  }

  async runSingle(test) {
    if (!(await this.initialize())) return;
    
    console.log(`🎯 Testing: ${test}\n`);

    switch (test.toLowerCase()) {
      case 'health': await this.testHealth(); break;
      case 'preferences': case 'prefs': await this.testPreferences(); break; 
      case 'favorites': case 'favourites': await this.testFavorites(); break;
      case 'watchlist': await this.testWatchlist(); break;
      case 'recommendations': case 'recs': await this.testRecommendations(); break;
      default:
        console.log(`❌ Unknown test: ${test}`);
        console.log('Available: health, preferences, favorites, watchlist, recommendations');
    }
  }
}

// CLI
async function main() {
  const tester = new InstantTester();
  const testName = process.argv[2];
  
  try {
    if (testName) {
      await tester.runSingle(testName);
    } else {
      await tester.runAll();
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}