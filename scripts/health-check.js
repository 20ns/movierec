#!/usr/bin/env node

/**
 * Health Check Script for MovieRec
 * Tests both frontend and backend health after deployment
 */

const axios = require('axios');
const https = require('https');

class HealthChecker {
  constructor(environment = 'production') {
    this.environment = environment;
    this.results = {
      frontend: {},
      backend: {},
      overall: { status: 'unknown', errors: [] }
    };
    
    // Configure URLs based on environment
    if (environment === 'staging') {
      this.frontendUrl = 'https://staging.movierec.net';
      this.backendUrl = process.env.STAGING_API_URL;
    } else {
      this.frontendUrl = 'https://movierec.net';
      this.backendUrl = process.env.REACT_APP_API_GATEWAY_INVOKE_URL;
    }
  }

  async checkFrontend() {
    console.log(`🌐 Checking frontend health: ${this.frontendUrl}`);
    
    try {
      const startTime = Date.now();
      
      // Check main page
      const mainPageResponse = await axios.get(this.frontendUrl, {
        timeout: 10000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      
      const responseTime = Date.now() - startTime;
      
      this.results.frontend.mainPage = {
        status: mainPageResponse.status === 200 ? 'healthy' : 'unhealthy',
        statusCode: mainPageResponse.status,
        responseTime: `${responseTime}ms`,
        contentLength: mainPageResponse.headers['content-length'] || 'unknown',
        deployedVia: 'AWS Amplify'
      };
      
      // Check manifest.json
      try {
        const manifestResponse = await axios.get(`${this.frontendUrl}/manifest.json`, {
          timeout: 5000
        });
        
        this.results.frontend.manifest = {
          status: manifestResponse.status === 200 ? 'healthy' : 'unhealthy',
          statusCode: manifestResponse.status
        };
      } catch (error) {
        this.results.frontend.manifest = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // Check service worker
      try {
        const swResponse = await axios.get(`${this.frontendUrl}/service-worker.js`, {
          timeout: 5000
        });
        
        this.results.frontend.serviceWorker = {
          status: swResponse.status === 200 ? 'healthy' : 'unhealthy',
          statusCode: swResponse.status
        };
      } catch (error) {
        this.results.frontend.serviceWorker = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // Check if this is likely an Amplify deployment
      try {
        const headResponse = await axios.head(this.frontendUrl, { timeout: 5000 });
        const isAmplify = headResponse.headers['server']?.includes('cloudfront') || 
                         headResponse.headers['x-cache']?.includes('cloudfront');
        
        this.results.frontend.hosting = {
          status: 'healthy',
          platform: isAmplify ? 'AWS Amplify (CloudFront)' : 'Unknown',
          cacheHeaders: headResponse.headers['x-cache'] || 'Not present'
        };
      } catch (error) {
        this.results.frontend.hosting = {
          status: 'unknown',
          error: error.message
        };
      }
      
    } catch (error) {
      this.results.frontend.mainPage = {
        status: 'unhealthy',
        error: error.message
      };
      this.results.overall.errors.push(`Frontend check failed: ${error.message}`);
    }
  }

  async checkBackend() {
    if (!this.backendUrl) {
      this.results.backend.api = {
        status: 'unhealthy',
        error: 'Backend URL not configured'
      };
      this.results.overall.errors.push('Backend URL not configured');
      return;
    }

    console.log(`🔗 Checking backend health: ${this.backendUrl}`);
    
    try {
      // Check health endpoint
      const healthResponse = await axios.get(`${this.backendUrl}/health`, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      this.results.backend.health = {
        status: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
        statusCode: healthResponse.status,
        data: healthResponse.data
      };
      
      // Check CORS
      try {
        const corsResponse = await axios.options(`${this.backendUrl}/recommendations`, {
          headers: {
            'Origin': this.frontendUrl,
            'Access-Control-Request-Method': 'GET'
          },
          timeout: 5000
        });
        
        this.results.backend.cors = {
          status: corsResponse.status === 200 ? 'healthy' : 'unhealthy',
          statusCode: corsResponse.status,
          headers: {
            'access-control-allow-origin': corsResponse.headers['access-control-allow-origin'],
            'access-control-allow-methods': corsResponse.headers['access-control-allow-methods']
          }
        };
      } catch (error) {
        this.results.backend.cors = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // Test critical endpoints
      const endpoints = ['/auth/signin', '/recommendations', '/user/preferences'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(`${this.backendUrl}${endpoint}`, {}, {
            timeout: 5000,
            validateStatus: (status) => status < 500 // Accept 4xx as valid (auth required)
          });
          
          this.results.backend[`endpoint_${endpoint.replace('/', '').replace('/', '_')}`] = {
            status: response.status < 500 ? 'healthy' : 'unhealthy',
            statusCode: response.status
          };
        } catch (error) {
          this.results.backend[`endpoint_${endpoint.replace('/', '').replace('/', '_')}`] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      }
      
    } catch (error) {
      this.results.backend.api = {
        status: 'unhealthy',
        error: error.message
      };
      this.results.overall.errors.push(`Backend check failed: ${error.message}`);
    }
  }

  calculateOverallHealth() {
    const allChecks = [
      ...Object.values(this.results.frontend),
      ...Object.values(this.results.backend)
    ];
    
    const healthyChecks = allChecks.filter(check => check.status === 'healthy').length;
    const totalChecks = allChecks.length;
    const healthPercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0;
    
    let overallStatus;
    if (healthPercentage >= 90) {
      overallStatus = 'healthy';
    } else if (healthPercentage >= 70) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }
    
    this.results.overall = {
      status: overallStatus,
      healthPercentage: Math.round(healthPercentage),
      healthyChecks,
      totalChecks,
      errors: this.results.overall.errors,
      timestamp: new Date().toISOString(),
      environment: this.environment
    };
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log(`🏥 HEALTH CHECK RESULTS - ${this.environment.toUpperCase()}`);
    console.log('='.repeat(60));
    
    // Overall status
    const statusEmoji = {
      'healthy': '✅',
      'degraded': '⚠️',
      'unhealthy': '❌'
    };
    
    console.log(`\n${statusEmoji[this.results.overall.status]} Overall Status: ${this.results.overall.status.toUpperCase()}`);
    console.log(`📊 Health: ${this.results.overall.healthPercentage}% (${this.results.overall.healthyChecks}/${this.results.overall.totalChecks} checks passed)`);
    
    // Frontend results
    console.log('\n🌐 FRONTEND CHECKS:');
    for (const [check, result] of Object.entries(this.results.frontend)) {
      const emoji = result.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${emoji} ${check}: ${result.status} ${result.responseTime || ''}`);
      if (result.error) console.log(`      Error: ${result.error}`);
    }
    
    // Backend results
    console.log('\n🔗 BACKEND CHECKS:');
    for (const [check, result] of Object.entries(this.results.backend)) {
      const emoji = result.status === 'healthy' ? '✅' : '❌';
      console.log(`  ${emoji} ${check}: ${result.status}`);
      if (result.error) console.log(`      Error: ${result.error}`);
    }
    
    // Errors
    if (this.results.overall.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.overall.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    return this.results.overall.status === 'healthy';
  }

  async run() {
    console.log(`🚀 Starting health check for ${this.environment} environment...`);
    
    await Promise.all([
      this.checkFrontend(),
      this.checkBackend()
    ]);
    
    this.calculateOverallHealth();
    
    const isHealthy = this.printResults();
    
    // Return appropriate exit code
    process.exit(isHealthy ? 0 : 1);
  }
}

// CLI execution
if (require.main === module) {
  const environment = process.argv[2] || 'production';
  const healthChecker = new HealthChecker(environment);
  healthChecker.run().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;