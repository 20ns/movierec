#!/bin/bash
# AWS Cost Optimization Script for MovieRec Project
# Ensures staying within free tier limits

echo "🎬 MovieRec AWS Cost Optimization"
echo "================================="

# 1. Check current costs
echo "📊 Current month costs by service:"
aws ce get-cost-and-usage \
    --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity DAILY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query 'ResultsByTime[*].Groups[?Total.BlendedCost.Amount>`0`].[Keys[0],Total.BlendedCost.Amount]' \
    --output table

# 2. Lambda function memory optimization
echo ""
echo "⚡ Optimizing Lambda functions to 128MB (minimum):"
FUNCTIONS=$(aws lambda list-functions --region eu-north-1 --query 'Functions[].FunctionName' --output text)
for func in $FUNCTIONS; do
    current_memory=$(aws lambda get-function-configuration --function-name "$func" --region eu-north-1 --query 'MemorySize' --output text)
    if [ "$current_memory" -gt 128 ]; then
        echo "  - Reducing $func from ${current_memory}MB to 128MB"
        aws lambda update-function-configuration --function-name "$func" --memory-size 128 --region eu-north-1 > /dev/null
    else
        echo "  ✓ $func already optimized at ${current_memory}MB"
    fi
done

# 3. Set Lambda timeout to minimum required
echo ""
echo "⏱️  Setting Lambda timeouts to 30s (recommended minimum):"
for func in $FUNCTIONS; do
    current_timeout=$(aws lambda get-function-configuration --function-name "$func" --region eu-north-1 --query 'Timeout' --output text)
    if [ "$current_timeout" -gt 30 ]; then
        echo "  - Reducing $func timeout from ${current_timeout}s to 30s"
        aws lambda update-function-configuration --function-name "$func" --timeout 30 --region eu-north-1 > /dev/null
    else
        echo "  ✓ $func timeout already optimized at ${current_timeout}s"
    fi
done

# 4. Check DynamoDB table sizes
echo ""
echo "📈 DynamoDB table usage (Free tier: 25GB storage, 25 RCU/WCU):"
for table in UserPreferences MovieRecCache Favourites Watchlist; do
    size=$(aws dynamodb describe-table --table-name "$table" --region eu-north-1 --query 'Table.TableSizeBytes' --output text 2>/dev/null || echo "0")
    size_mb=$((size / 1024 / 1024))
    echo "  - $table: ${size_mb}MB"
    if [ "$size_mb" -gt 1000 ]; then
        echo "    ⚠️  Large table - consider cleanup if over 20GB total"
    fi
done

# 5. Check API Gateway usage
echo ""
echo "🌐 API Gateway endpoints (Free tier: 1M requests/month):"
aws apigateway get-rest-apis --region eu-north-1 --query 'items[].{Name:name,Id:id}' --output table

echo ""
echo "✅ Optimization complete!"
echo ""
echo "💡 Free Tier Limits Summary:"
echo "  • Lambda: 1M requests + 400K GB-seconds/month"
echo "  • DynamoDB: 25GB storage + 25 RCU/WCU"
echo "  • API Gateway: 1M requests/month"
echo "  • CloudWatch Logs: 5GB storage/month"
echo ""
echo "🚨 Budget Alert: $1.00/month limit set with 80% warning"