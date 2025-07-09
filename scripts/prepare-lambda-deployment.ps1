#!/usr/bin/env pwsh

# Pre-deployment script to copy shared code to Lambda functions
Write-Host "Preparing Lambda functions for deployment..." -ForegroundColor Green

# List of Lambda functions that use the shared response module
$lambdaFunctions = @(
    "FavouritesFunction",
    "MediaCache", 
    "MovieRecPersonalizedApiHandler",
    "RefreshTokenLambda",
    "signin",
    "SignupHandler",
    "UserPreferencesFunction",
    "UserStatsFunction",
    "watchlist"
)

$sourceSharedDir = "c:\Users\xboxo\Desktop\movierec\lambda-functions\shared"
$lambdaFunctionsDir = "c:\Users\xboxo\Desktop\movierec\lambda-functions"

# Ensure source shared directory exists
if (-not (Test-Path $sourceSharedDir)) {
    Write-Error "Source shared directory not found: $sourceSharedDir"
    exit 1
}

Write-Host "Copying shared directory to Lambda functions..." -ForegroundColor Yellow

$successCount = 0
$errorCount = 0

foreach ($func in $lambdaFunctions) {
    $funcDir = Join-Path $lambdaFunctionsDir $func
    $targetDir = Join-Path $funcDir "shared"
    
    # Check if function directory exists
    if (-not (Test-Path $funcDir)) {
        Write-Warning "Function directory not found: $funcDir"
        $errorCount++
        continue
    }
    
    try {
        # Remove existing shared directory if it exists
        if (Test-Path $targetDir) {
            Remove-Item -Recurse -Force $targetDir
        }
        
        # Copy shared directory
        Copy-Item -Recurse $sourceSharedDir $targetDir -ErrorAction Stop
        Write-Host "  ✓ Copied shared directory to $func" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Error "  ✗ Failed to copy shared directory to $func`: $($_.Exception.Message)"
        $errorCount++
    }
}

Write-Host "`nSummary:" -ForegroundColor Blue
Write-Host "  Successfully copied: $successCount" -ForegroundColor Green
Write-Host "  Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })

if ($errorCount -gt 0) {
    Write-Host "`nSome functions failed to copy. Please check the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nAll Lambda functions are ready for deployment!" -ForegroundColor Green
}
