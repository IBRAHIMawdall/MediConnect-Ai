# Simple Deployment Script for Windows
# This script provides multiple deployment options

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "firebase", "docker", "all")]
    [string]$Target = "all"
)

Write-Host "Starting deployment process..." -ForegroundColor Green

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to deploy locally
function Deploy-Local {
    Write-Host "Deploying locally..." -ForegroundColor Yellow
    
    # Build frontend
    Write-Host "Building frontend..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend build failed!" -ForegroundColor Red
        return $false
    }
    
    # Start backend
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Start-Process -FilePath "python" -ArgumentList "main.py" -WindowStyle Hidden
    
    # Wait a moment for backend to start
    Start-Sleep -Seconds 3
    
    # Test backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend is running successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "Local deployment complete!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
    return $true
}

# Function to deploy to Firebase
function Deploy-Firebase {
    Write-Host "Deploying to Firebase..." -ForegroundColor Yellow
    
    if (-not (Test-Command "firebase")) {
        Write-Host "Firebase CLI not found. Please install it first." -ForegroundColor Red
        return $false
    }
    
    # Build frontend
    Write-Host "Building frontend for production..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Frontend build failed!" -ForegroundColor Red
        return $false
    }
    
    # Deploy to Firebase
    Write-Host "Deploying to Firebase..." -ForegroundColor Cyan
    firebase deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Firebase deployment failed!" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Firebase deployment complete!" -ForegroundColor Green
    return $true
}

# Function to deploy with Docker
function Deploy-Docker {
    Write-Host "Deploying with Docker..." -ForegroundColor Yellow
    
    if (-not (Test-Command "docker")) {
        Write-Host "Docker not found. Please install Docker Desktop first." -ForegroundColor Red
        return $false
    }
    
    # Check if Docker is running
    try {
        docker info | Out-Null
    } catch {
        Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        return $false
    }
    
    # Use simplified docker-compose
    Write-Host "Starting services with Docker Compose..." -ForegroundColor Cyan
    docker-compose -f docker-compose.dev.yml up -d --build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker deployment failed!" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Docker deployment complete!" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:80" -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
    return $true
}

# Main deployment logic
switch ($Target) {
    "local" {
        Deploy-Local
    }
    "firebase" {
        Deploy-Firebase
    }
    "docker" {
        Deploy-Docker
    }
    "all" {
        Write-Host "Deploying to all targets..." -ForegroundColor Yellow
        
        $localSuccess = Deploy-Local
        Start-Sleep -Seconds 2
        
        $firebaseSuccess = Deploy-Firebase
        Start-Sleep -Seconds 2
        
        $dockerSuccess = Deploy-Docker
        
        Write-Host "`nDeployment Summary:" -ForegroundColor Green
        Write-Host "Local: $(if($localSuccess) {'✓'} else {'✗'})" -ForegroundColor $(if($localSuccess) {'Green'} else {'Red'})
        Write-Host "Firebase: $(if($firebaseSuccess) {'✓'} else {'✗'})" -ForegroundColor $(if($firebaseSuccess) {'Green'} else {'Red'})
        Write-Host "Docker: $(if($dockerSuccess) {'✓'} else {'✗'})" -ForegroundColor $(if($dockerSuccess) {'Green'} else {'Red'})
    }
}

Write-Host "`nDeployment script completed!" -ForegroundColor Green
