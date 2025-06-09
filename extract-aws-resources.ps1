# PowerShell script to extract AWS resources
# Run this script to download all your existing AWS configurations and Lambda code

param(
    [string]$Region = "eu-north-1",
    [string]$ApiGatewayId = "n09230hhhj"
)

Write-Host "🚀 AWS Resource Extraction Tool (PowerShell)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if AWS CLI is installed and configured
try {
    $awsIdentity = aws sts get-caller-identity 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
    } else {
        throw "AWS CLI not configured"
    }
} catch {
    Write-Host "❌ AWS CLI not configured or not installed!" -ForegroundColor Red
    Write-Host "Please run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Create directories
$exportDirs = @("aws-exports", "lambda-functions", "infrastructure-configs")
foreach ($dir in $exportDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
}

Write-Host "`n🌐 EXPORTING API GATEWAY CONFIGURATION" -ForegroundColor Cyan

# Export API Gateway details
Write-Host "Getting API Gateway details..."
$apiDetails = aws apigateway get-rest-api --rest-api-id $ApiGatewayId --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $apiDetails | Out-File -FilePath "infrastructure-configs\api-gateway-details.json" -Encoding UTF8
    Write-Host "✅ Exported API Gateway details" -ForegroundColor Green
}

# Export API Gateway as Swagger
Write-Host "Exporting API Gateway as Swagger..."
$swaggerExport = aws apigateway get-export --parameters extensions='integrations' --rest-api-id $ApiGatewayId --stage-name prod --export-type swagger --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $swaggerExport | Out-File -FilePath "infrastructure-configs\api-gateway-swagger.json" -Encoding UTF8
    Write-Host "✅ Exported Swagger definition" -ForegroundColor Green
}

# Export API Gateway resources
Write-Host "Getting API Gateway resources..."
$resources = aws apigateway get-resources --rest-api-id $ApiGatewayId --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $resources | Out-File -FilePath "infrastructure-configs\api-gateway-resources.json" -Encoding UTF8
    Write-Host "✅ Exported API Gateway resources" -ForegroundColor Green
}

Write-Host "`n⚡ EXPORTING LAMBDA FUNCTIONS" -ForegroundColor Cyan

# List all Lambda functions
$functionsList = aws lambda list-functions --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $functions = $functionsList | ConvertFrom-Json
    
    foreach ($func in $functions.Functions) {
        $functionName = $func.FunctionName
        Write-Host "`n📦 Processing function: $functionName" -ForegroundColor Yellow
        
        # Create function directory
        $funcDir = "lambda-functions\$functionName"
        if (!(Test-Path $funcDir)) {
            New-Item -ItemType Directory -Path $funcDir -Force | Out-Null
        }
        
        # Get function configuration
        $config = aws lambda get-function-configuration --function-name $functionName --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            $config | Out-File -FilePath "infrastructure-configs\lambda-$functionName-config.json" -Encoding UTF8
            Write-Host "✅ Exported configuration for $functionName" -ForegroundColor Green
        }
        
        # Get function code URL
        $codeInfo = aws lambda get-function --function-name $functionName --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            $codeData = $codeInfo | ConvertFrom-Json
            $downloadUrl = $codeData.Code.Location
            
            # Download the code zip
            $zipPath = "$funcDir\function.zip"
            try {
                Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
                Write-Host "✅ Downloaded code for $functionName" -ForegroundColor Green
                
                # Extract the zip
                Expand-Archive -Path $zipPath -DestinationPath $funcDir -Force
                Write-Host "✅ Extracted code for $functionName" -ForegroundColor Green
                
                # Save function metadata
                $codeInfo | Out-File -FilePath "$funcDir\function-info.json" -Encoding UTF8
                
            } catch {
                Write-Host "❌ Failed to download code for $functionName" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n🗄️ EXPORTING DYNAMODB TABLES" -ForegroundColor Cyan

# List all DynamoDB tables
$tablesList = aws dynamodb list-tables --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $tables = $tablesList | ConvertFrom-Json
    
    foreach ($tableName in $tables.TableNames) {
        Write-Host "`n📋 Processing table: $tableName" -ForegroundColor Yellow
        
        # Get table description
        $tableDesc = aws dynamodb describe-table --table-name $tableName --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            $tableDesc | Out-File -FilePath "infrastructure-configs\dynamodb-$tableName.json" -Encoding UTF8
            Write-Host "✅ Exported schema for table $tableName" -ForegroundColor Green
        }
        
        # Export sample table data
        $tableData = aws dynamodb scan --table-name $tableName --max-items 10 --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            $tableData | Out-File -FilePath "infrastructure-configs\dynamodb-$tableName-sample-data.json" -Encoding UTF8
            Write-Host "✅ Exported sample data for table $tableName" -ForegroundColor Green
        }
    }
}

Write-Host "`n👤 EXPORTING COGNITO CONFIGURATION" -ForegroundColor Cyan

# Your existing user pool ID
$userPoolId = "eu-north-1_x2FwI0mFK"
$clientId = "4gob38of1s9tu7h9ciik5unjrl"

# Export user pool configuration
$userPoolDesc = aws cognito-idp describe-user-pool --user-pool-id $userPoolId --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $userPoolDesc | Out-File -FilePath "infrastructure-configs\cognito-user-pool.json" -Encoding UTF8
    Write-Host "✅ Exported Cognito User Pool configuration" -ForegroundColor Green
}

# Export user pool client configuration
$clientDesc = aws cognito-idp describe-user-pool-client --user-pool-id $userPoolId --client-id $clientId --region $Region 2>$null
if ($LASTEXITCODE -eq 0) {
    $clientDesc | Out-File -FilePath "infrastructure-configs\cognito-user-pool-client.json" -Encoding UTF8
    Write-Host "✅ Exported Cognito User Pool Client configuration" -ForegroundColor Green
}

Write-Host "`n📊 GENERATING SUMMARY REPORT" -ForegroundColor Cyan

# Generate summary report
$report = @{
    exportDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    region = $Region
    apiGatewayId = $ApiGatewayId
    exportedResources = @{
        lambdaFunctions = @()
        dynamodbTables = @()
        apiGateway = $true
        cognito = $true
    }
    nextSteps = @(
        "1. Review exported configurations in ./infrastructure-configs/",
        "2. Review Lambda function code in ./lambda-functions/",
        "3. Use the CDK templates to recreate infrastructure",
        "4. Test thoroughly before switching DNS/endpoints",
        "5. Update frontend to use new endpoints"
    )
}

# Count exported resources
if (Test-Path "lambda-functions") {
    $report.exportedResources.lambdaFunctions = Get-ChildItem "lambda-functions" -Directory | Select-Object -ExpandProperty Name
}

$report | ConvertTo-Json -Depth 4 | Out-File -FilePath "aws-exports\export-summary.json" -Encoding UTF8

Write-Host "`n🎉 EXPORT COMPLETE!" -ForegroundColor Green
Write-Host "📁 Check the following directories:" -ForegroundColor Yellow
Write-Host "   - infrastructure-configs/ - AWS resource configurations" -ForegroundColor Gray
Write-Host "   - lambda-functions/ - Lambda function source code" -ForegroundColor Gray
Write-Host "   - aws-exports/ - Summary and reports" -ForegroundColor Gray

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the exported files" -ForegroundColor Gray
Write-Host "2. Run the CDK deployment script" -ForegroundColor Gray
Write-Host "3. Test the new infrastructure" -ForegroundColor Gray
