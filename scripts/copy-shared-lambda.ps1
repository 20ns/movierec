#!/usr/bin/env pwsh

# Copy shared directory to all Lambda functions that need it
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

Write-Host "Copying shared directory to Lambda functions..."

foreach ($func in $lambdaFunctions) {
    $targetDir = Join-Path $lambdaFunctionsDir $func "shared"
    
    # Remove existing shared directory if it exists
    if (Test-Path $targetDir) {
        Remove-Item -Recurse -Force $targetDir
        Write-Host "Removed existing shared directory in $func"
    }
    
    # Copy shared directory
    Copy-Item -Recurse $sourceSharedDir $targetDir
    Write-Host "Copied shared directory to $func"
}

Write-Host "Shared directory copy complete!"
