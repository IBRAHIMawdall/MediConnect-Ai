#!/usr/bin/env pwsh
# Firebase Project Initialization Script
# This script helps set up a new Firebase project for the Medical Information App

param(
    [string]$ProjectId,
    [string]$ProjectName = "Medical Information App",
    [string]$Region = "us-central1",
    [switch]$SkipEmulators,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🔥 Firebase Project Initialization" -ForegroundColor Cyan
Write-Host "This script will help you set up Firebase for your Medical Information App" -ForegroundColor Yellow

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
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm is not installed. Please install npm" -ForegroundColor Red
    exit 1
}

# Install Firebase CLI if not present
if (-not (Test-Command "firebase")) {
    Write-Host "📦 Installing Firebase CLI..." -ForegroundColor Yellow
    Invoke-SafeCommand "npm install -g firebase-tools" "Installing Firebase CLI"
} else {
    Write-Host "✅ Firebase CLI is already installed" -ForegroundColor Green
}

# Login to Firebase
Write-Host "🔐 Firebase Authentication" -ForegroundColor Blue
try {
    $firebaseUser = firebase auth:list 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Please log in to Firebase..." -ForegroundColor Yellow
        Invoke-SafeCommand "firebase login" "Firebase login"
    } else {
        Write-Host "✅ Already logged in to Firebase" -ForegroundColor Green
    }
} catch {
    Write-Host "Please log in to Firebase..." -ForegroundColor Yellow
    Invoke-SafeCommand "firebase login" "Firebase login"
}

# Get or create project
if (-not $ProjectId) {
    Write-Host "\n📝 Project Setup" -ForegroundColor Blue
    Write-Host "You need to provide a Firebase Project ID." -ForegroundColor Yellow
    Write-Host "You can either:" -ForegroundColor Yellow
    Write-Host "1. Use an existing project ID" -ForegroundColor Yellow
    Write-Host "2. Create a new project in the Firebase Console (https://console.firebase.google.com)" -ForegroundColor Yellow
    
    $ProjectId = Read-Host "Enter your Firebase Project ID"
    
    if (-not $ProjectId) {
        Write-Host "❌ Project ID is required" -ForegroundColor Red
        exit 1
    }
}

Write-Host "\n🎯 Using Project ID: $ProjectId" -ForegroundColor Cyan

# Initialize Firebase in the project
Write-Host "\n🚀 Initializing Firebase project..." -ForegroundColor Blue

# Use the project
Invoke-SafeCommand "firebase use $ProjectId" "Setting Firebase project"

# Initialize Firebase features
Write-Host "\n⚙️ Configuring Firebase features..." -ForegroundColor Blue

# Check if firebase.json exists
if (Test-Path "firebase.json") {
    Write-Host "✅ Firebase configuration already exists" -ForegroundColor Green
} else {
    Write-Host "Creating Firebase configuration..." -ForegroundColor Yellow
    
    # Create a basic firebase.json if it doesn't exist
    $firebaseConfig = @{
        hosting = @{
            public = "dist"
            ignore = @(
                "firebase.json",
                "**/.*",
                "**/node_modules/**"
            )
            rewrites = @(
                @{
                    source = "**"
                    destination = "/index.html"
                }
            )
        }
        functions = @(
            @{
                source = "functions"
                codebase = "default"
                runtime = "python311"
            }
        )
        firestore = @{
            rules = "firestore.rules"
            indexes = "firestore.indexes.json"
        }
    } | ConvertTo-Json -Depth 10
    
    $firebaseConfig | Out-File -FilePath "firebase.json" -Encoding UTF8
    Write-Host "✅ Created firebase.json" -ForegroundColor Green
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "\n📄 Creating environment configuration..." -ForegroundColor Blue
    
    $envContent = @"
# Firebase Configuration
VITE_FIREBASE_PROJECT_ID=$ProjectId
VITE_FIREBASE_AUTH_DOMAIN=$ProjectId.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=$ProjectId.appspot.com

# Environment
VITE_NODE_ENV=development
VITE_USE_FIREBASE_EMULATORS=true

# Firebase Emulator Ports
VITE_FIREBASE_AUTH_EMULATOR_PORT=9099
VITE_FIREBASE_FIRESTORE_EMULATOR_PORT=8080
VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT=5001
VITE_FIREBASE_STORAGE_EMULATOR_PORT=9199

# API Configuration
VITE_API_BASE_URL=http://localhost:5001/$ProjectId/us-central1
VITE_ENABLE_ANALYTICS=false

# Security
VITE_ENABLE_SECURITY_HEADERS=true
VITE_ENABLE_CSP=true

# Performance
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_OFFLINE_SUPPORT=true
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "⚠️ Please update the .env file with your actual Firebase configuration values" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "\n📦 Installing project dependencies..." -ForegroundColor Blue
Invoke-SafeCommand "npm install" "Installing dependencies"

# Create functions directory and files if they don't exist
if (-not (Test-Path "functions")) {
    Write-Host "\n🔧 Setting up Cloud Functions..." -ForegroundColor Blue
    New-Item -ItemType Directory -Path "functions" -Force | Out-Null
    Write-Host "✅ Created functions directory" -ForegroundColor Green
}

# Start emulators if not skipped
if (-not $SkipEmulators) {
    Write-Host "\n🔧 Starting Firebase emulators..." -ForegroundColor Blue
    Write-Host "This will start the Firebase emulator suite for local development" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the emulators when you're done" -ForegroundColor Yellow
    
    Start-Sleep -Seconds 2
    
    try {
        Invoke-SafeCommand "firebase emulators:start" "Starting Firebase emulators"
    } catch {
        Write-Host "⚠️ Emulators failed to start. You can start them manually later with 'firebase emulators:start'" -ForegroundColor Yellow
    }
} else {
    Write-Host "\n⏭️ Skipping emulator startup" -ForegroundColor Yellow
    Write-Host "You can start emulators later with: firebase emulators:start" -ForegroundColor Cyan
}

# Final instructions
Write-Host "\n🎉 Firebase initialization completed!" -ForegroundColor Green
Write-Host "\n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env file with the actual Firebase configuration values" -ForegroundColor White
Write-Host "2. Configure Firebase Authentication providers in the Firebase Console" -ForegroundColor White
Write-Host "3. Set up Firestore database and security rules" -ForegroundColor White
Write-Host "4. Deploy your functions: npm run firebase:deploy:functions" -ForegroundColor White
Write-Host "5. Deploy your app: npm run firebase:deploy" -ForegroundColor White

Write-Host "\n🔗 Useful links:" -ForegroundColor Cyan
Write-Host "Firebase Console: https://console.firebase.google.com/project/$ProjectId" -ForegroundColor Blue
Write-Host "Firebase Documentation: https://firebase.google.com/docs" -ForegroundColor Blue

Write-Host "\n✨ Happy coding!" -ForegroundColor Green