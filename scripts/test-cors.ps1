#!/usr/bin/env pwsh

# Test CORS for all endpoints
$baseUrl = "https://t12klotnl5.execute-api.eu-north-1.amazonaws.com/prod"
$productionOrigin = "https://www.movierec.net"
$localhostOrigin = "http://localhost:3000"
$invalidOrigin = "https://malicious.com"

$endpoints = @(
    "/user/watchlist",
    "/user/favourites", 
    "/user/preferences",
    "/user/stats/summary",
    "/recommendations",
    "/health"
)

Write-Host "Testing CORS for all endpoints..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

foreach ($endpoint in $endpoints) {
    Write-Host "`nTesting endpoint: $endpoint" -ForegroundColor Yellow
    
    # Test with production origin
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Headers @{"Origin"=$productionOrigin; "Authorization"="Bearer invalid_token"} -Method GET
    } catch {
        $response = $_.Exception.Response
    }
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    Write-Host "  Production Origin: $corsHeader" -ForegroundColor $(if ($corsHeader -eq $productionOrigin) { "Green" } else { "Red" })
    
    # Test with localhost origin
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Headers @{"Origin"=$localhostOrigin; "Authorization"="Bearer invalid_token"} -Method GET
    } catch {
        $response = $_.Exception.Response
    }
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    Write-Host "  Localhost Origin: $corsHeader" -ForegroundColor $(if ($corsHeader -eq $localhostOrigin) { "Green" } else { "Red" })
    
    # Test with invalid origin
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Headers @{"Origin"=$invalidOrigin; "Authorization"="Bearer invalid_token"} -Method GET
    } catch {
        $response = $_.Exception.Response
    }
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    Write-Host "  Invalid Origin: $corsHeader" -ForegroundColor $(if ($corsHeader -eq $productionOrigin) { "Green" } else { "Red" })
}

Write-Host "`n=================================" -ForegroundColor Green
Write-Host "CORS testing complete!" -ForegroundColor Green
