#!/bin/bash
# Deploy Lambda fixes for 502 error resolution

set -e

echo "🚀 Deploying Lambda Function Fixes"
echo "=================================="

# Ensure we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# 1. Ensure JWT layer dependencies are installed
echo "📦 Step 1: Ensuring JWT layer dependencies..."
./scripts/fix-jwt-dependencies.sh

# 2. Run CORS validation to ensure everything is working
echo "🌐 Step 2: Validating CORS configuration..."
if ! timeout 30s node scripts/validate-cors.js; then
    echo "❌ CORS validation failed - fix issues before deploying"
    exit 1
fi

# 3. Prepare lambda functions with shared code
echo "🔧 Step 3: Preparing Lambda functions with shared code..."
cd infrastructure
npm run pre-deploy
cd ..

# 4. Verify that the fixes are in place
echo "✅ Step 4: Verifying Lambda function fixes..."

LAMBDA_FUNCTIONS=(
    "UserPreferencesFunction"
    "FavouritesFunction" 
    "watchlist"
)

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    if grep -q "Invalid JWT token format" "lambda-functions/$func/index.js"; then
        echo "✅ $func: Error handling fix verified"
    else
        echo "❌ $func: Error handling fix NOT found"
        exit 1
    fi
done

# 5. Deploy infrastructure
echo "🏗️ Step 5: Deploying infrastructure..."
cd infrastructure
echo "Running CDK deployment..."
npx cdk deploy --require-approval never
cd ..

# 6. Wait for deployment to propagate
echo "⏳ Step 6: Waiting for deployment to propagate..."
sleep 30

# 7. Test the fixed endpoints
echo "🧪 Step 7: Testing fixed endpoints..."
timeout 60s node scripts/diagnose-auth-issue.js

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🎯 Expected Results:"
echo "- API endpoints should now return 401 instead of 502 errors"
echo "- Proper error messages for authentication issues"
echo "- No more Lambda function crashes"
echo ""
echo "🔍 Monitor the application at: https://www.movierec.net"
echo "📊 Check CloudWatch logs for any remaining issues"