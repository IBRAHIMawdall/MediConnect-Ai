#!/bin/bash

# Production Build Script for Medical Information Application
set -e

echo "🚀 Starting production build process..."

# Load environment variables
echo "📋 Loading production environment..."
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

# Build frontend (if React/TypeScript files exist)
echo "🔨 Building frontend assets..."
if [ -f "package.json" ]; then
    npm ci --only=production
    npm run build
    
    # Create optimized build directory
    mkdir -p dist
    cp -r build/* dist/ 2>/dev/null || true
    
    # Generate service worker for caching
    cat > dist/sw.js << 'EOF'
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('medical-app-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/static/js/main.*.js',
        '/static/css/main.*.css',
        '/manifest.json'
      ]);
    })
  );
});
EOF
    
    echo "✅ Frontend built successfully"
fi

# Build Docker image for backend
echo "🐳 Building Docker image..."
docker build -t medical-app-prod:latest .

echo "✅ Docker image built successfully"

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deployment

# Copy necessary files
cp docker-compose.prod.yml deployment/
cp .env.production deployment/
cp firebase.json deployment/ 2>/dev/null || true

# Create deployment script
cat > deployment/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying to production..."

# Start services
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deployment completed successfully!"
echo "🌐 Application available at: http://localhost:8080"
echo "📊 Health check: http://localhost:8080/health"
EOF

chmod +x deployment/deploy.sh

# Create Firebase deployment script
if [ -f "firebase.json" ]; then
    cat > deployment/deploy-firebase.sh << 'EOF'
#!/bin/bash
set -e

echo "🔥 Deploying to Firebase Hosting..."

# Install Firebase CLI if not present
if ! command -v firebase &> /dev/null; then
    npm install -g firebase-tools
fi

# Deploy to Firebase
firebase deploy --only hosting

echo "✅ Firebase deployment completed successfully!"
EOF
    
    chmod +x deployment/deploy-firebase.sh
fi

echo "🎉 Production build completed!"
echo "📁 Deployment files created in: deployment/"
echo "📋 Next steps:"
echo "  1. Configure environment variables in deployment/.env.production"
echo "  2. Run: cd deployment && ./deploy.sh"
if [ -f "firebase.json" ]; then
    echo "  3. For Firebase: cd deployment && ./deploy-firebase.sh"
fi