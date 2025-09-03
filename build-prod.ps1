# Production Build Script for Medical Information Application
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting production build process..." -ForegroundColor Green

# Load environment variables
Write-Host "📋 Loading production environment..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match "^([^#][^=]*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Build frontend (if React/TypeScript files exist)
Write-Host "🔨 Building frontend assets..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    # Create optimized build directory
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" -Force
    }
    
    # Copy source files to dist for production
    if (Test-Path "src") {
        Copy-Item -Path "src\*" -Destination "dist\" -Recurse -Force
    }
    
    # Copy main files
    if (Test-Path "index.html") {
        Copy-Item -Path "index.html" -Destination "dist\" -Force
    }
    
    # Copy any existing build output
    if (Test-Path "build") {
        Copy-Item -Path "build\*" -Destination "dist\" -Recurse -Force
    }
    
    # Generate service worker for caching
    $serviceWorkerContent = @'
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('medical-app-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/main.jsx',
        '/App.jsx'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
'@
    
    Set-Content -Path "dist\sw.js" -Value $serviceWorkerContent
    
    Write-Host "✅ Frontend files prepared for production" -ForegroundColor Green
    Write-Host "ℹ️ Note: For full optimization, run 'npm install && npm run build' when dependencies are resolved" -ForegroundColor Cyan
}

# Build Docker image for backend
Write-Host "🐳 Building Docker image..." -ForegroundColor Yellow
try {
    docker build -t medical-app-prod:latest .
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Docker build failed or Docker not available: $_" -ForegroundColor Red
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
if (-not (Test-Path "deployment")) {
    New-Item -ItemType Directory -Path "deployment" -Force
}

# Copy necessary files
if (Test-Path "docker-compose.prod.yml") {
    Copy-Item -Path "docker-compose.prod.yml" -Destination "deployment\" -Force
}
if (Test-Path ".env.production") {
    Copy-Item -Path ".env.production" -Destination "deployment\" -Force
}
if (Test-Path "firebase.json") {
    Copy-Item -Path "firebase.json" -Destination "deployment\" -Force
}

# Create deployment script for Windows
$deployScriptContent = @'
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
'@

Set-Content -Path "deployment\deploy.ps1" -Value $deployScriptContent

# Create Firebase deployment script for Windows
if (Test-Path "firebase.json") {
    $firebaseDeployContent = @'
# PowerShell Firebase deployment script
$ErrorActionPreference = "Stop"

Write-Host "🔥 Deploying to Firebase Hosting..." -ForegroundColor Green

# Check if Firebase CLI is installed
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Deploy to Firebase
try {
    firebase deploy --only hosting
    Write-Host "✅ Firebase deployment completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase deployment failed: $_" -ForegroundColor Red
    exit 1
}
'@
    
    Set-Content -Path "deployment\deploy-firebase.ps1" -Value $firebaseDeployContent
}

Write-Host "🎉 Production build completed!" -ForegroundColor Green
Write-Host "📁 Deployment files created in: deployment/" -ForegroundColor Cyan
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Configure environment variables in deployment\.env.production" -ForegroundColor White
Write-Host "  2. Run: cd deployment; .\deploy.ps1" -ForegroundColor White
if (Test-Path "firebase.json") {
    Write-Host "  3. For Firebase: cd deployment; .\deploy-firebase.ps1" -ForegroundColor White
}

Write-Host "\n💡 To run this script: .\build-prod.ps1" -ForegroundColor Yellow
Write-Host "💡 If execution policy blocks it, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow