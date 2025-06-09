const https = require('https');

console.log('🚀 Starting Basic End-to-End Test...');

// Test the media endpoint (public)
const testUrl = 'https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod/media?query=batman';

console.log('Testing:', testUrl);

https.get(testUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Length:', data.length);
        
        if (res.statusCode === 200) {
            try {
                const parsed = JSON.parse(data);
                console.log('✅ API is working! Results found:', parsed.results?.length || 0);
            } catch (e) {
                console.log('✅ API responded but could not parse JSON');
            }
        } else {
            console.log('❌ API returned error status');
        }
    });
}).on('error', (err) => {
    console.log('❌ Request failed:', err.message);
});
