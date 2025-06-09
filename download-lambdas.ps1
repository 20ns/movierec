# Download all Lambda functions
$functions = @(
    "Watchlist",
    "signin", 
    "RefreshTokenLambda",
    "SignupHandler",
    "MediaCache",
    "MovieRecPersonalizedApiHandler",
    "UserPreferencesFunction",
    "FavouritesFunction"
)

$extractDir = "c:\Users\Nav\Desktop\movierec\extracted-lambdas"

foreach ($func in $functions) {
    Write-Host "Downloading $func..."
    
    # Get the download URL
    $downloadUrl = aws lambda get-function --function-name $func --region eu-north-1 --query 'Code.Location' --output text
    
    if ($downloadUrl) {
        # Download the zip file
        $zipPath = Join-Path $extractDir "$func.zip"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
        
        # Extract the zip file
        $extractPath = Join-Path $extractDir $func
        if (Test-Path $extractPath) {
            Remove-Item $extractPath -Recurse -Force
        }
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        
        Write-Host "✓ Downloaded and extracted $func"
    } else {
        Write-Host "✗ Failed to get download URL for $func"
    }
}

Write-Host "All Lambda functions downloaded!"
