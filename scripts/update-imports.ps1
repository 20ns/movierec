# Update import paths in Lambda functions
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
    $filePath = "c:\Users\xboxo\Desktop\movierec\lambda-functions\$func\index.js"
    if (Test-Path $filePath) {
        Write-Host "Updating import path in $func..."
        
        # Read the file content
        $content = Get-Content $filePath -Raw
        
        # Replace the import path
        $content = $content -replace '\.\./shared/cors-utils', './shared/cors-utils'
        
        # Write back to file
        Set-Content -Path $filePath -Value $content
        Write-Host "Updated import path in $func"
    } else {
        Write-Host "File not found: $filePath"
    }
}

Write-Host "Done updating import paths in all Lambda functions."
