# PowerShell script to fix the .env file for backend startup

$envFile = ".env"
$desiredLine = "environment=development"

# Create .env if it doesn't exist
if (-not (Test-Path $envFile)) {
    Set-Content -Path $envFile -Value $desiredLine
    Write-Host ".env file created with: $desiredLine" -ForegroundColor Green
} else {
    # Read all lines, remove any 'environment=' lines
    $lines = Get-Content $envFile | Where-Object { -not ($_ -match '^environment=') }
    # Add the correct line at the top
    $newLines = @($desiredLine) + $lines
    Set-Content -Path $envFile -Value $newLines
    Write-Host ".env file updated with: $desiredLine" -ForegroundColor Green
}

Write-Host "Current .env contents:" -ForegroundColor Cyan
Get-Content $envFile

Write-Host "You can now run: python main.py" -ForegroundColor Yellow
