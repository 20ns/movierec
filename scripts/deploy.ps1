#!/usr/bin/env pwsh

# Comprehensive deployment script for the movie recommendation system
Write-Host "Starting deployment process..." -ForegroundColor Blue
Write-Host "==============================" -ForegroundColor Blue

# Step 1: Prepare Lambda functions
Write-Host "`nStep 1: Preparing Lambda functions..." -ForegroundColor Yellow
$prepareScript = Join-Path $PSScriptRoot "prepare-lambda-deployment.ps1"
& $prepareScript

if ($LASTEXITCODE -ne 0) {
    Write-Error "Lambda preparation failed. Stopping deployment."
    exit 1
}

# Step 2: Deploy infrastructure
Write-Host "`nStep 2: Deploying infrastructure..." -ForegroundColor Yellow
Set-Location "c:\Users\xboxo\Desktop\movierec\infrastructure"

try {
    npm run cdk deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Error "CDK deployment failed."
        exit 1
    }
} catch {
    Write-Error "CDK deployment failed: $($_.Exception.Message)"
    exit 1
}

# Step 3: Test deployment
Write-Host "`nStep 3: Testing deployment..." -ForegroundColor Yellow
$testScript = Join-Path $PSScriptRoot "test-cors.ps1"
& $testScript

Write-Host "`n==============================" -ForegroundColor Blue
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Blue
