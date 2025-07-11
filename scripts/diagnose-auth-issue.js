#!/usr/bin/env node
/**
 * Authentication Issue Diagnostic Tool
 * 
 * This script helps diagnose authentication issues between frontend and backend
 */

const https = require('https');

console.log('🔍 Authentication Issue Diagnostic');
console.log('==================================');

// Test the API endpoints that are failing
const testEndpoints = [
    '/user/preferences',
    '/user/favourites', 
    '/user/watchlist'
];

const apiBaseUrl = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod';

async function testEndpoint(endpoint) {
    console.log(`\n🧪 Testing ${endpoint}...`);
    
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:3000',
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(`${apiBaseUrl}${endpoint}`, options, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Headers:`, Object.keys(res.headers));
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`   Response:`, parsed);
                } catch (e) {
                    console.log(`   Raw Response:`, data.substring(0, 200));
                }
                resolve({ endpoint, status: res.statusCode, data });
            });
        });
        
        req.on('error', (error) => {
            console.log(`   Error:`, error.message);
            resolve({ endpoint, error: error.message });
        });
        
        req.setTimeout(5000, () => {
            console.log(`   Timeout`);
            req.destroy();
            resolve({ endpoint, error: 'timeout' });
        });
        
        req.end();
    });
}

async function testWithFakeAuth(endpoint) {
    console.log(`\n🔐 Testing ${endpoint} with fake Bearer token...`);
    
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:3000',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake.jwt.token'
            }
        };
        
        const req = https.request(`${apiBaseUrl}${endpoint}`, options, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    console.log(`   Response:`, parsed);
                } catch (e) {
                    console.log(`   Raw Response:`, data.substring(0, 200));
                }
                resolve({ endpoint, status: res.statusCode, data });
            });
        });
        
        req.on('error', (error) => {
            console.log(`   Error:`, error.message);
            resolve({ endpoint, error: error.message });
        });
        
        req.setTimeout(5000, () => {
            console.log(`   Timeout`);
            req.destroy();
            resolve({ endpoint, error: 'timeout' });
        });
        
        req.end();
    });
}

async function main() {
    console.log('Testing API endpoints without authentication...');
    
    for (const endpoint of testEndpoints) {
        await testEndpoint(endpoint);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
    
    console.log('\nTesting with fake authentication...');
    
    for (const endpoint of testEndpoints) {
        await testWithFakeAuth(endpoint);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    }
    
    console.log('\n📋 Summary:');
    console.log('- 401 errors without auth are expected');
    console.log('- 502 errors indicate Lambda function failures');
    console.log('- Look for "Invalid token format" vs "No authorization header" errors');
    
    console.log('\n💡 Solutions:');
    console.log('1. If getting 401 "No authorization header": Frontend auth issue');
    console.log('2. If getting 502 errors: Backend Lambda function issue');
    console.log('3. If getting "Invalid token format": JWT parsing issue');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testEndpoint, testWithFakeAuth };