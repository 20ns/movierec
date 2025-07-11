/**
 * CORS Integration Tests
 * 
 * Comprehensive CORS testing to ensure API endpoints work correctly
 * with the frontend and handle cross-origin requests properly
 */

const https = require('https');

// Configuration
const API_BASE_URL = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';
const PRODUCTION_DOMAIN = 'https://www.movierec.net';
const LOCALHOST_DOMAIN = 'http://localhost:3000';
const TIMEOUT_MS = 10000;

// Helper function to make CORS requests
function makeCorsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const defaultOptions = {
            method: 'OPTIONS',
            headers: {
                'User-Agent': 'CORS-Test-Suite',
                ...options.headers
            },
            timeout: TIMEOUT_MS
        };

        const req = https.request(url, { ...defaultOptions, ...options }, (res) => {
            let data = '';
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('CORS request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

describe('CORS Preflight Requests', () => {
    const endpoints = [
        '/user/preferences',
        '/user/favourites',
        '/user/watchlist'
    ];

    endpoints.forEach(endpoint => {
        describe(`${endpoint} CORS`, () => {
            test('should handle OPTIONS preflight from production domain', async () => {
                const response = await makeCorsRequest(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Origin': PRODUCTION_DOMAIN,
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'authorization,content-type'
                    }
                });

                expect(response.statusCode).toBe(204);
                expect(response.headers).toHaveProperty('access-control-allow-origin');
                expect(response.headers).toHaveProperty('access-control-allow-methods');
                expect(response.headers).toHaveProperty('access-control-allow-headers');
            }, 15000);

            test('should handle OPTIONS preflight from localhost', async () => {
                const response = await makeCorsRequest(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Origin': LOCALHOST_DOMAIN,
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'authorization,content-type'
                    }
                });

                expect(response.statusCode).toBe(204);
                expect(response.headers['access-control-allow-origin']).toMatch(/localhost:3000|movierec\.net/);
            }, 15000);

            test('should allow required HTTP methods', async () => {
                const methods = ['GET', 'POST', 'DELETE'];
                
                for (const method of methods) {
                    const response = await makeCorsRequest(`${API_BASE_URL}${endpoint}`, {
                        headers: {
                            'Origin': PRODUCTION_DOMAIN,
                            'Access-Control-Request-Method': method
                        }
                    });

                    expect(response.statusCode).toBe(204);
                    expect(response.headers['access-control-allow-methods']).toMatch(new RegExp(method));
                }
            }, 20000);

            test('should allow required headers', async () => {
                const response = await makeCorsRequest(`${API_BASE_URL}${endpoint}`, {
                    headers: {
                        'Origin': PRODUCTION_DOMAIN,
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'authorization,content-type,x-api-key'
                    }
                });

                expect(response.statusCode).toBe(204);
                
                const allowedHeaders = response.headers['access-control-allow-headers'] || '';
                expect(allowedHeaders.toLowerCase()).toMatch(/authorization/);
                expect(allowedHeaders.toLowerCase()).toMatch(/content-type/);
            }, 15000);
        });
    });
});

describe('CORS Actual Requests', () => {
    const endpoints = [
        '/user/preferences',
        '/user/favourites',
        '/user/watchlist'
    ];

    endpoints.forEach(endpoint => {
        test(`${endpoint} should include CORS headers in actual responses`, async () => {
            const response = await makeCorsRequest(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Origin': PRODUCTION_DOMAIN,
                    'Content-Type': 'application/json'
                }
            });

            // Should not be 502 (Lambda crash)
            expect(response.statusCode).not.toBe(502);
            
            // Should include CORS headers even in error responses
            expect(response.headers).toHaveProperty('access-control-allow-origin');
            
            // Should handle the request gracefully (401 for unauthorized is expected)
            expect([401, 403, 200, 404]).toContain(response.statusCode);
        }, 15000);
    });
});

describe('CORS Security', () => {
    test('should not allow arbitrary origins', async () => {
        const maliciousOrigins = [
            'https://evil.com',
            'https://malicious-site.net',
            'https://phishing-movierec.com'
        ];

        for (const origin of maliciousOrigins) {
            const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
                headers: {
                    'Origin': origin,
                    'Access-Control-Request-Method': 'GET'
                }
            });

            // Should either reject the origin or return a safe default
            const corsOrigin = response.headers['access-control-allow-origin'];
            expect(corsOrigin).not.toBe(origin);
            expect(corsOrigin).toMatch(/localhost:3000|movierec\.net|\*/);
        }
    }, 20000);

    test('should not expose sensitive headers', async () => {
        const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
            headers: {
                'Origin': PRODUCTION_DOMAIN,
                'Access-Control-Request-Method': 'GET'
            }
        });

        const allowedHeaders = response.headers['access-control-allow-headers'] || '';
        
        // Should not expose AWS internal headers
        expect(allowedHeaders.toLowerCase()).not.toMatch(/x-amz-|x-aws-/);
        expect(allowedHeaders.toLowerCase()).not.toMatch(/authorization.*aws/);
    }, 15000);
});

describe('CORS Error Handling', () => {
    test('should include CORS headers in error responses', async () => {
        const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
            method: 'GET',
            headers: {
                'Origin': PRODUCTION_DOMAIN,
                'Authorization': 'Bearer invalid.jwt.token'
            }
        });

        // Should return 401 error with CORS headers
        expect(response.statusCode).toBe(401);
        expect(response.headers).toHaveProperty('access-control-allow-origin');
        
        // Error response should be JSON
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('error');
    }, 15000);

    test('should handle missing Origin header gracefully', async () => {
        const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
                // No Origin header
            }
        });

        // Should not crash, should handle gracefully
        expect(response.statusCode).not.toBe(502);
        expect([401, 403, 200]).toContain(response.statusCode);
    }, 15000);
});

describe('Browser Compatibility', () => {
    test('should work with different browser User-Agent strings', async () => {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        ];

        for (const userAgent of userAgents) {
            const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
                headers: {
                    'Origin': PRODUCTION_DOMAIN,
                    'User-Agent': userAgent,
                    'Access-Control-Request-Method': 'GET'
                }
            });

            expect(response.statusCode).toBe(204);
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        }
    }, 25000);

    test('should handle complex preflight scenarios', async () => {
        const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
            headers: {
                'Origin': PRODUCTION_DOMAIN,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'authorization,content-type,x-requested-with'
            }
        });

        expect(response.statusCode).toBe(204);
        expect(response.headers).toHaveProperty('access-control-allow-methods');
        expect(response.headers).toHaveProperty('access-control-max-age');
    }, 15000);
});

describe('Performance and Reliability', () => {
    test('CORS responses should be fast', async () => {
        const startTime = Date.now();
        
        const response = await makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
            headers: {
                'Origin': PRODUCTION_DOMAIN,
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        const responseTime = Date.now() - startTime;

        expect(response.statusCode).toBe(204);
        expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    }, 10000);

    test('CORS should work consistently across multiple requests', async () => {
        const promises = Array(5).fill().map(() => 
            makeCorsRequest(`${API_BASE_URL}/user/preferences`, {
                headers: {
                    'Origin': PRODUCTION_DOMAIN,
                    'Access-Control-Request-Method': 'GET'
                }
            })
        );

        const responses = await Promise.all(promises);

        responses.forEach(response => {
            expect(response.statusCode).toBe(204);
            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    }, 20000);
});