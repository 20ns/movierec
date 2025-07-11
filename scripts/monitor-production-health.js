#!/usr/bin/env node
/**
 * Production Health Monitor
 * 
 * This script monitors the production website and API endpoints to ensure they're healthy
 */

const https = require('https');

console.log('🔍 Production Health Monitor');
console.log('============================');

const PRODUCTION_URL = 'https://www.movierec.net';
const API_BASE_URL = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';

const endpoints = [
    { path: '/user/preferences', name: 'User Preferences' },
    { path: '/user/favourites', name: 'User Favourites' },
    { path: '/user/watchlist', name: 'User Watchlist' }
];

async function checkWebsite() {
    console.log('\n🌐 Checking Production Website...');
    
    return new Promise((resolve) => {
        const req = https.request(PRODUCTION_URL, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Content-Type: ${res.headers['content-type']}`);
            
            if (res.statusCode === 200) {
                console.log('   ✅ Website is accessible');
                resolve({ success: true, status: res.statusCode });
            } else {
                console.log('   ❌ Website has issues');
                resolve({ success: false, status: res.statusCode });
            }
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ Website error: ${error.message}`);
            resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(10000, () => {
            console.log('   ⏱️ Website request timed out');
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
        
        req.end();
    });
}

async function checkApiEndpoint(endpoint) {
    console.log(`\n🔌 Checking API: ${endpoint.name}...`);
    
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
                'Origin': PRODUCTION_URL,
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(`${API_BASE_URL}${endpoint.path}`, options, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let responseData = null;
                try {
                    responseData = JSON.parse(data);
                } catch (e) {
                    responseData = data.substring(0, 100);
                }
                
                if (res.statusCode === 401) {
                    console.log('   ✅ Proper 401 authentication error (expected)');
                    console.log(`   Message: ${responseData.error || 'Unauthorized'}`);
                    resolve({ success: true, status: res.statusCode, expected: true });
                } else if (res.statusCode === 502) {
                    console.log('   ❌ 502 error - Lambda function crashed');
                    console.log(`   Message: ${responseData.message || 'Internal server error'}`);
                    resolve({ success: false, status: res.statusCode, error: '502 Bad Gateway' });
                } else {
                    console.log(`   ⚠️ Unexpected status: ${res.statusCode}`);
                    console.log(`   Response: ${JSON.stringify(responseData)}`);
                    resolve({ success: false, status: res.statusCode, unexpected: true });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ Request error: ${error.message}`);
            resolve({ success: false, error: error.message });
        });
        
        req.setTimeout(10000, () => {
            console.log('   ⏱️ Request timed out');
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
        
        req.end();
    });
}

async function main() {
    const results = {
        website: null,
        endpoints: [],
        overall: false
    };
    
    // Check website
    results.website = await checkWebsite();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check API endpoints
    for (const endpoint of endpoints) {
        const result = await checkApiEndpoint(endpoint);
        results.endpoints.push({ ...endpoint, ...result });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate summary
    console.log('\n📊 Health Summary:');
    console.log('==================');
    
    if (results.website.success) {
        console.log('✅ Website: Healthy');
    } else {
        console.log('❌ Website: Issues detected');
    }
    
    let apiHealthy = 0;
    let apiTotal = results.endpoints.length;
    
    for (const endpoint of results.endpoints) {
        if (endpoint.success) {
            console.log(`✅ ${endpoint.name}: Healthy (returns proper 401)`);
            apiHealthy++;
        } else if (endpoint.status === 502) {
            console.log(`❌ ${endpoint.name}: Lambda crash (502 error)`);
        } else {
            console.log(`⚠️ ${endpoint.name}: Unexpected response`);
        }
    }
    
    results.overall = results.website.success && apiHealthy === apiTotal;
    
    console.log('\n🎯 Next Steps:');
    console.log('==============');
    
    if (results.overall) {
        console.log('🎉 All systems healthy! The 502 errors have been resolved.');
        console.log('   - Website is accessible');
        console.log('   - API endpoints return proper 401 errors (not 502)');
        console.log('   - Users will now see proper authentication prompts');
    } else {
        const hasOldIssues = results.endpoints.some(e => e.status === 502);
        
        if (hasOldIssues) {
            console.log('⚠️ Still detecting 502 errors. The Lambda fixes need to be deployed:');
            console.log('   1. Run: ./scripts/deploy-lambda-fixes.sh');
            console.log('   2. Or manually deploy via CDK: cd infrastructure && npx cdk deploy');
            console.log('   3. Wait 2-3 minutes for propagation');
            console.log('   4. Run this monitor script again');
        } else {
            console.log('ℹ️ Mixed results detected. Check individual issues above.');
        }
    }
    
    console.log('\n🔗 Useful Links:');
    console.log(`   - Website: ${PRODUCTION_URL}`);
    console.log(`   - API Base: ${API_BASE_URL}`);
    console.log('   - CloudWatch Logs: AWS Console → CloudWatch → Log Groups');
    
    return results.overall;
}

if (require.main === module) {
    main()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('Monitor failed:', error);
            process.exit(1);
        });
}

module.exports = { checkWebsite, checkApiEndpoint };