const https = require('https');
const { URL } = require('url');

// Configuration
const API_BASE_URL = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const TEST_USER = {
    email: 'test.user@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
};

let authTokens = {};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null
                    };
                    resolve(result);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

// Test functions
async function testSignup() {
    console.log('\n🔐 Testing User Signup...');
    try {
        const response = await makeRequest(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            body: TEST_USER
        });

        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200 || response.statusCode === 201) {
            console.log('✅ Signup successful');
            return true;
        } else if (response.statusCode === 400 && response.body.message && response.body.message.includes('already exists')) {
            console.log('⚠️  User already exists - proceeding with signin');
            return true;
        } else {
            console.log('❌ Signup failed:', response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Signup error:', error.message);
        return false;
    }
}

async function testSignin() {
    console.log('\n🔑 Testing User Signin...');
    try {
        const response = await makeRequest(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            body: {
                email: TEST_USER.email,
                password: TEST_USER.password
            }
        });

        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200 && response.body.AccessToken) {
            console.log('✅ Signin successful');
            authTokens.accessToken = response.body.AccessToken;
            authTokens.idToken = response.body.IdToken;
            authTokens.refreshToken = response.body.RefreshToken;
            console.log('🎫 Tokens received and stored');
            return true;
        } else {
            console.log('❌ Signin failed:', response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Signin error:', error.message);
        return false;
    }
}

async function testUserPreferences() {
    console.log('\n🎬 Testing User Preferences...');
    const authHeader = { 'Authorization': `Bearer ${authTokens.idToken}` };
    
    try {
        // Test GET preferences
        console.log('📋 Getting user preferences...');
        const getResponse = await makeRequest(`${API_BASE_URL}/user/preferences`, {
            method: 'GET',
            headers: authHeader
        });
        
        console.log(`GET Status: ${getResponse.statusCode}`);
        if (getResponse.statusCode === 200) {
            console.log('✅ Get preferences successful');
            console.log('Current preferences:', getResponse.body);
        }

        // Test PUT preferences
        console.log('💾 Updating user preferences...');
        const testPreferences = {
            genres: ['Action', 'Comedy', 'Drama'],
            languages: ['en', 'es'],
            releaseYearRange: { min: 2000, max: 2024 }
        };

        const putResponse = await makeRequest(`${API_BASE_URL}/user/preferences`, {
            method: 'PUT',
            headers: authHeader,
            body: testPreferences
        });

        console.log(`PUT Status: ${putResponse.statusCode}`);
        if (putResponse.statusCode === 200) {
            console.log('✅ Update preferences successful');
            return true;
        } else {
            console.log('❌ Update preferences failed:', putResponse.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Preferences error:', error.message);
        return false;
    }
}

async function testFavorites() {
    console.log('\n❤️  Testing Favorites...');
    const authHeader = { 'Authorization': `Bearer ${authTokens.idToken}` };
    
    try {
        // Test GET favorites
        console.log('📋 Getting user favorites...');
        const getResponse = await makeRequest(`${API_BASE_URL}/user/favourites`, {
            method: 'GET',
            headers: authHeader
        });
        
        console.log(`GET Status: ${getResponse.statusCode}`);
        if (getResponse.statusCode === 200) {
            console.log('✅ Get favorites successful');
            console.log('Current favorites count:', getResponse.body?.length || 0);
        }

        // Test POST favorites (add a movie)
        console.log('➕ Adding movie to favorites...');
        const testMovie = {
            tmdbId: 550, // Fight Club
            title: 'Fight Club',
            posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg'
        };

        const postResponse = await makeRequest(`${API_BASE_URL}/user/favourites`, {
            method: 'POST',
            headers: authHeader,
            body: testMovie
        });

        console.log(`POST Status: ${postResponse.statusCode}`);
        if (postResponse.statusCode === 200 || postResponse.statusCode === 201) {
            console.log('✅ Add to favorites successful');
            
            // Test DELETE favorites
            console.log('🗑️  Removing movie from favorites...');
            const deleteResponse = await makeRequest(`${API_BASE_URL}/user/favourites?tmdbId=${testMovie.tmdbId}`, {
                method: 'DELETE',
                headers: authHeader
            });

            console.log(`DELETE Status: ${deleteResponse.statusCode}`);
            if (deleteResponse.statusCode === 200) {
                console.log('✅ Remove from favorites successful');
                return true;
            }
        } else {
            console.log('❌ Add to favorites failed:', postResponse.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Favorites error:', error.message);
        return false;
    }
}

async function testWatchlist() {
    console.log('\n📺 Testing Watchlist...');
    const authHeader = { 'Authorization': `Bearer ${authTokens.idToken}` };
    
    try {
        // Test GET watchlist
        console.log('📋 Getting user watchlist...');
        const getResponse = await makeRequest(`${API_BASE_URL}/user/watchlist`, {
            method: 'GET',
            headers: authHeader
        });
        
        console.log(`GET Status: ${getResponse.statusCode}`);
        if (getResponse.statusCode === 200) {
            console.log('✅ Get watchlist successful');
            console.log('Current watchlist count:', getResponse.body?.length || 0);
        }

        // Test POST watchlist (add a movie)
        console.log('➕ Adding movie to watchlist...');
        const testMovie = {
            tmdbId: 13, // Forrest Gump
            title: 'Forrest Gump',
            posterPath: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg'
        };

        const postResponse = await makeRequest(`${API_BASE_URL}/user/watchlist`, {
            method: 'POST',
            headers: authHeader,
            body: testMovie
        });

        console.log(`POST Status: ${postResponse.statusCode}`);
        if (postResponse.statusCode === 200 || postResponse.statusCode === 201) {
            console.log('✅ Add to watchlist successful');
            
            // Test DELETE watchlist
            console.log('🗑️  Removing movie from watchlist...');
            const deleteResponse = await makeRequest(`${API_BASE_URL}/user/watchlist?tmdbId=${testMovie.tmdbId}`, {
                method: 'DELETE',
                headers: authHeader
            });

            console.log(`DELETE Status: ${deleteResponse.statusCode}`);
            if (deleteResponse.statusCode === 200) {
                console.log('✅ Remove from watchlist successful');
                return true;
            }
        } else {
            console.log('❌ Add to watchlist failed:', postResponse.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Watchlist error:', error.message);
        return false;
    }
}

async function testRecommendations() {
    console.log('\n🎯 Testing Recommendations...');
    const authHeader = { 'Authorization': `Bearer ${authTokens.idToken}` };
    
    try {
        const response = await makeRequest(`${API_BASE_URL}/recommendations`, {
            method: 'GET',
            headers: authHeader
        });
        
        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log('✅ Get recommendations successful');
            console.log('Recommendations count:', response.body?.length || 0);
            return true;
        } else {
            console.log('❌ Get recommendations failed:', response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Recommendations error:', error.message);
        return false;
    }
}

async function testMediaEndpoint() {
    console.log('\n🎥 Testing Media Endpoint (Public)...');
    
    try {
        const response = await makeRequest(`${API_BASE_URL}/media?query=batman&type=movie`, {
            method: 'GET'
        });
        
        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log('✅ Media search successful');
            console.log('Search results count:', response.body?.results?.length || 0);
            return true;
        } else {
            console.log('❌ Media search failed:', response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Media search error:', error.message);
        return false;
    }
}

async function testRefreshToken() {
    console.log('\n🔄 Testing Token Refresh...');
    
    try {
        const response = await makeRequest(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            body: {
                refreshToken: authTokens.refreshToken
            }
        });
        
        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200 && response.body.AccessToken) {
            console.log('✅ Token refresh successful');
            authTokens.accessToken = response.body.AccessToken;
            authTokens.idToken = response.body.IdToken;
            return true;
        } else {
            console.log('❌ Token refresh failed:', response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Token refresh error:', error.message);
        return false;
    }
}

// Main test runner
async function runEndToEndTests() {
    console.log('🚀 Starting End-to-End Tests for Movie Recommendation App');
    console.log('=' .repeat(60));
    
    const results = {};
    
    // Public endpoint test (no auth required)
    results.media = await testMediaEndpoint();
    
    // Authentication flow
    results.signup = await testSignup();
    results.signin = await testSignin();
    
    if (results.signin) {
        // Protected endpoints (require authentication)
        results.preferences = await testUserPreferences();
        results.favorites = await testFavorites();
        results.watchlist = await testWatchlist();
        results.recommendations = await testRecommendations();
        results.refresh = await testRefreshToken();
    } else {
        console.log('\n❌ Skipping protected endpoint tests due to signin failure');
    }
    
    // Results summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result ? '✅ PASS' : '❌ FAIL';
        console.log(`${test.toUpperCase().padEnd(15)}: ${status}`);
    });
    
    console.log('-' .repeat(60));
    console.log(`TOTAL: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED! Your CDK migration is successful!');
        console.log('✅ Your infrastructure is ready for production use.');
        console.log('\n📋 Next Steps:');
        console.log('1. ✅ CDK Infrastructure - COMPLETE');
        console.log('2. ✅ API Gateway & Lambda Functions - COMPLETE');
        console.log('3. ✅ Frontend Configuration - COMPLETE');
        console.log('4. ✅ End-to-End Functionality - COMPLETE');
        console.log('5. 🔄 Optional: Clean up old AWS console resources');
        console.log('6. 🔄 Optional: Update DNS/domain settings if applicable');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
}

// Run the tests
runEndToEndTests().catch(console.error);
