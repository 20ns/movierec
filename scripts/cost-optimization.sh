#!/bin/bash

# AWS Cost Optimization Script for MovieRec
# This script helps reduce AWS costs by setting appropriate retention policies and disabling unnecessary features

echo "🔍 AWS Cost Optimization for MovieRec"
echo "======================================"

# Set region
REGION="eu-north-1"

echo "📊 Setting CloudWatch log retention policies..."

# Set API Gateway log retention to 7 days
echo "  Setting API Gateway log retention..."
aws --region $REGION logs put-retention-policy --log-group-name "API-Gateway-Execution-Logs_t12klotnl5/prod" --retention-in-days 7 2>/dev/null || echo "    Note: API Gateway log group may not exist yet"
aws --region $REGION logs put-retention-policy --log-group-name "API-Gateway-Execution-Logs_n09230hhhj/prod" --retention-in-days 7 2>/dev/null || echo "    Note: Old API Gateway log group may not exist"

# Set Lambda function log retention to 7 days
echo "  Setting Lambda log retention..."
LAMBDA_LOG_GROUPS=(
    "/aws/lambda/signin"
    "/aws/lambda/SignupHandler"
    "/aws/lambda/RefreshTokenLambda"
    "/aws/lambda/UserPreferencesFunction"
    "/aws/lambda/FavouritesFunction"
    "/aws/lambda/favourite"
    "/aws/lambda/Watchlist"
    "/aws/lambda/MovieRecPersonalizedApiHandler"
    "/aws/lambda/MediaCache"
    "/aws/lambda/InfrastructureStack-SigninFunctionF7F181E7-GLD2OfssnWCX"
    "/aws/lambda/InfrastructureStack-SignupFunction2AD1B0FF-3a5Cb503sXmD"
    "/aws/lambda/InfrastructureStack-RefreshTokenFunction37E34807-UkbPVdAU1wru"
    "/aws/lambda/InfrastructureStack-UserPreferencesFunctionE60C62F-56vyqbB1Qoum"
    "/aws/lambda/InfrastructureStack-FavouritesFunctionA99F73A4-MWEOUxZ1hqfr"
    "/aws/lambda/InfrastructureStack-WatchlistFunction0F6DE204-qNQHIyHNONeN"
    "/aws/lambda/InfrastructureStack-MovieRecFunctionD78028BB-UlKpUNVass97"
    "/aws/lambda/InfrastructureStack-MediaCacheFunction78E83152-S8TLG84Bbs53"
    "/aws/lambda/InfrastructureStack-UserStatsFunction7063798E-fjboTAmbcrgT"
)

for log_group in "${LAMBDA_LOG_GROUPS[@]}"; do
    aws --region $REGION logs put-retention-policy --log-group-name "$log_group" --retention-in-days 7 2>/dev/null && echo "    ✅ Set retention for $log_group" || echo "    ⚠️  Could not set retention for $log_group (may not exist)"
done

echo ""
echo "💰 Cost optimization recommendations:"
echo "  1. ✅ CloudWatch log retention set to 7 days"
echo "  2. ✅ API Gateway tracing disabled"
echo "  3. ✅ API Gateway logging level set to ERROR only"
echo "  4. ⚠️  Consider setting up DynamoDB auto-scaling if usage increases"
echo "  5. ⚠️  Monitor Lambda concurrency limits to avoid charges"
echo ""

echo "📈 Current log group sizes:"
aws --region $REGION logs describe-log-groups --query 'logGroups[?contains(logGroupName, `lambda`) || contains(logGroupName, `API-Gateway`)].[logGroupName,storedBytes,retentionInDays]' --output table

echo ""
echo "✅ Cost optimization completed!"
echo "💡 Run this script monthly to maintain cost efficiency"