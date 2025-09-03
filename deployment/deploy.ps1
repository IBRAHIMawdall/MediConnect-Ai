# PowerShell deployment script
$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying to production..." -ForegroundColor Green

# Start services
try {
    docker-compose -f docker-compose.prod.yml up -d
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Application available at: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "📊 Health check: http://localhost:8080/health" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}
