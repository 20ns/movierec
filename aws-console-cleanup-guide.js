#!/usr/bin/env node

/**
 * AWS Console Cleanup Guide
 * This script helps identify old AWS resources that can be safely removed
 */

console.log('🧹 AWS Console Cleanup Guide');
console.log('=' .repeat(50));

console.log('\n✅ YOUR CDK-MANAGED RESOURCES (KEEP THESE):');
console.log('');
console.log('🔗 API Gateway:');
console.log('   ID: t12klotnl5');
console.log('   URL: https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod');
console.log('   ✅ This is managed by CDK - DO NOT DELETE');

console.log('\n⚡ Lambda Functions (keep these - they start with "InfrastructureStack-"):');
const cdkFunctions = [
    'InfrastructureStack-SigninFunction',
    'InfrastructureStack-SignupFunction', 
    'InfrastructureStack-MovieRecFunction',
    'InfrastructureStack-MediaCacheFunction',
    'InfrastructureStack-UserPreferencesFunction',
    'InfrastructureStack-FavouritesFunction',
    'InfrastructureStack-WatchlistFunction',
    'InfrastructureStack-RefreshTokenFunction'
];

cdkFunctions.forEach(func => {
    console.log(`   ✅ ${func} (CDK-managed)`);
});

console.log('\n🗄️ DynamoDB Tables (keep these):');
const tables = ['UserPreferences', 'Favourites', 'Watchlist', 'MovieRecCache'];
tables.forEach(table => {
    console.log(`   ✅ ${table} (imported by CDK)`);
});

console.log('\n👤 Cognito (keep these):');
console.log('   ✅ User Pool: eu-north-1_x2FwI0mFK');
console.log('   ✅ Client ID: 4gob38of1s9tu7h9ciik5unjrl');

console.log('\n❌ OLD RESOURCES SAFE TO DELETE:');
console.log('');
console.log('🗑️ Old API Gateway:');
console.log('   ID: n09230hhhj');
console.log('   URL: https://n09230hhhj.execute-api.eu-north-1.amazonaws.com/prod');
console.log('   ❌ Safe to delete - no longer used');

console.log('\n🗑️ Old Lambda Functions (if they exist):');
console.log('   Look for functions that do NOT start with "InfrastructureStack-"');
console.log('   Examples that might exist:');
console.log('   ❌ movierec-recommendations');
console.log('   ❌ movierec-preferences');
console.log('   ❌ Any manually created Lambda functions for MovieRec');

console.log('\n📊 CloudWatch Log Groups:');
console.log('   Safe to delete log groups for old Lambda functions');
console.log('   Keep log groups that start with "/aws/lambda/InfrastructureStack-"');

console.log('\n⚠️ DELETION CHECKLIST:');
console.log('');
console.log('1. ✅ Test your application thoroughly first');
console.log('2. ✅ Ensure all functionality works with CDK infrastructure');
console.log('3. ✅ Take screenshots/notes of old resources before deletion');
console.log('4. ❌ Delete old API Gateway (n09230hhhj)');
console.log('5. ❌ Delete old Lambda functions (non-CDK ones)');
console.log('6. ❌ Delete old CloudWatch log groups');
console.log('7. 💰 Enjoy the cost savings!');

console.log('\n💡 TO DELETE OLD API GATEWAY:');
console.log('1. Go to AWS Console → API Gateway');
console.log('2. Select the API with ID: n09230hhhj');
console.log('3. Click "Actions" → "Delete"');
console.log('4. Type the API name to confirm deletion');

console.log('\n💡 TO DELETE OLD LAMBDA FUNCTIONS:');
console.log('1. Go to AWS Console → Lambda');
console.log('2. Look for functions that do NOT start with "InfrastructureStack-"');
console.log('3. Select old functions → Delete');
console.log('4. Confirm deletion');

console.log('\n🎉 After cleanup, your AWS account will be clean and cost-optimized!');
console.log('📱 Your application will continue working perfectly with CDK infrastructure.');
