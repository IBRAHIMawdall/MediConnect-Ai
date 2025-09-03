#!/usr/bin/env pwsh
# Firebase Deployment Script for Medical Information App
# This script handles complete Firebase deployment including hosting, functions, and Firestore

param(
    [string]$Environment = "development",
    [switch]$SkipBuild,
    [switch]$OnlyHosting,
    [switch]$OnlyFunctions,
    [switch]$OnlyFirestore,
    [switch]$UseEmulators,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🚀 Firebase Deployment Script" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to run command with error handling
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$ContinueOnError
    )
    
    Write-Host "📋 $Description" -ForegroundColor Green
    Write-Verbose "Executing: $Command"
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        Write-Host "✅ $Description completed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
        if (-not $ContinueOnError) {
            exit 1
        }
    }
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "firebase")) {
    Write-Host "❌ Firebase CLI is not installed. Installing..." -ForegroundColor Yellow
    Invoke-SafeCommand "npm install -g firebase-tools" "Installing Firebase CLI"
}

# Check if user is logged in to Firebase
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Blue
try {
    $firebaseUser = firebase auth:list 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "🔑 Please log in to Firebase..." -ForegroundColor Yellow
        Invoke-SafeCommand "firebase login" "Firebase login"
    }
} catch {
    Write-Host "🔑 Please log in to Firebase..." -ForegroundColor Yellow
    Invoke-SafeCommand "firebase login" "Firebase login"
}

# Set environment variables based on environment
if ($Environment -eq "production") {
    $env:NODE_ENV = "production"
    $env:VITE_NODE_ENV = "production"
    $env:VITE_USE_FIREBASE_EMULATORS = "false"
    $env:VITE_ENABLE_ANALYTICS = "true"
} else {
    $env:NODE_ENV = "development"
    $env:VITE_NODE_ENV = "development"
    $env:VITE_USE_FIREBASE_EMULATORS = "true"
    $env:VITE_ENABLE_ANALYTICS = "false"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
Invoke-SafeCommand "npm ci" "Installing frontend dependencies"

# Install Python dependencies for Cloud Functions
if (Test-Path "functions\requirements.txt") {
    Write-Host "🐍 Installing Python dependencies for Cloud Functions..." -ForegroundColor Blue
    Push-Location "functions"
    try {
        if (Test-Command "python") {
            Invoke-SafeCommand "python -m pip install -r requirements.txt" "Installing Python dependencies"
        } elseif (Test-Command "python3") {
            Invoke-SafeCommand "python3 -m pip install -r requirements.txt" "Installing Python dependencies"
        } else {
            Write-Host "⚠️ Python not found. Cloud Functions deployment may fail." -ForegroundColor Yellow
        }
    } finally {
        Pop-Location
    }
}

# Build the application (unless skipped)
if (-not $SkipBuild) {
    if ($Environment -eq "production") {
        Invoke-SafeCommand "npm run build:prod" "Building application for production"
    } else {
        Invoke-SafeCommand "npm run build" "Building application for development"
    }
}

# Start emulators if requested
if ($UseEmulators) {
    Write-Host "🔧 Starting Firebase emulators..." -ForegroundColor Blue
    Start-Process -FilePath "firebase" -ArgumentList "emulators:start" -NoNewWindow
    Start-Sleep -Seconds 5
    Write-Host "✅ Firebase emulators started" -ForegroundColor Green
    return
}

# Deploy based on options
Write-Host "🚀 Starting Firebase deployment..." -ForegroundColor Blue

if ($OnlyHosting) {
    Invoke-SafeCommand "firebase deploy --only hosting" "Deploying Firebase Hosting"
} elseif ($OnlyFunctions) {
    Invoke-SafeCommand "firebase deploy --only functions" "Deploying Cloud Functions"
} elseif ($OnlyFirestore) {
    Invoke-SafeCommand "firebase deploy --only firestore" "Deploying Firestore rules and indexes"
} else {
    # Full deployment
    Invoke-SafeCommand "firebase deploy" "Deploying complete Firebase project"
}

# Post-deployment tasks
Write-Host "🔧 Running post-deployment tasks..." -ForegroundColor Blue

# Clear cache if in production
if ($Environment -eq "production") {
    Invoke-SafeCommand "npm run cache:clear" "Clearing cache" -ContinueOnError
}

# Run security audit
Invoke-SafeCommand "npm run security:audit" "Running security audit" -ContinueOnError

# Get deployment info
Write-Host "📊 Getting deployment information..." -ForegroundColor Blue
try {
    $projectInfo = firebase projects:list --json | ConvertFrom-Json
    $currentProject = firebase use --json | ConvertFrom-Json
    
    Write-Host "\n🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "Project: $($currentProject.project)" -ForegroundColor Cyan
    Write-Host "Environment: $Environment" -ForegroundColor Cyan
    
    if (-not $OnlyFunctions -and -not $OnlyFirestore) {
        Write-Host "Hosting URL: https://$($currentProject.project).web.app" -ForegroundColor Cyan
    }
    
    if (-not $OnlyHosting -and -not $OnlyFirestore) {
        Write-Host "Functions URL: https://us-central1-$($currentProject.project).cloudfunctions.net" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "⚠️ Could not retrieve deployment information" -ForegroundColor Yellow
}

Write-Host "\n✨ Firebase deployment process completed!" -ForegroundColor Green
