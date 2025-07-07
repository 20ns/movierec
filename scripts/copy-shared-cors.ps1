# Copy shared CORS utilities to Lambda functions
$sharedPath = "c:\Users\xboxo\Desktop\movierec\lambda-functions\shared"
$lambdaFunctions = @(
    "FavouritesFunction",
    "watchlist", 
    "UserPreferencesFunction",
    "UserStatsFunction",
    "SignupHandler",
    "signin",
    "RefreshTokenLambda",
    "MovieRecPersonalizedApiHandler",
    "MediaCache",
    "health"
)

foreach ($func in $lambdaFunctions) {
    $targetPath = "c:\Users\xboxo\Desktop\movierec\lambda-functions\$func\shared"
    Write-Host "Copying shared folder to $func..."
    
    # Remove existing shared folder if it exists
    if (Test-Path $targetPath) {
        Remove-Item -Path $targetPath -Recurse -Force
    }
    
    # Copy the shared folder
    Copy-Item -Path $sharedPath -Destination $targetPath -Recurse
    Write-Host "Copied shared folder to $func"
}

Write-Host "Done copying shared CORS utilities to all Lambda functions."
