# Production Deployment Guide

## Overview
This document provides comprehensive instructions for deploying the Medical Information Application to production environments, including Firebase Hosting and Docker container deployment.

## Prerequisites

### Required Tools
- Node.js 16+ and npm
- Python 3.11+
- Docker and Docker Compose
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Environment Variables
Create `.env.production` file with the following configuration:

```bash
# Production Environment Configuration
NODE_ENV=production
DATABASE_URL=sqlite:///medical.db
OPENFDA_API_KEY=your_openfda_api_key_here
RATE_LIMIT_QPS=10
SCHEDULE_OPENFDA_NDC_CRON=0 2 * * *
SCHEDULE_OPENFDA_LABEL_CRON=0 3 * * *
CORS_ORIGINS=https://your-firebase-app.web.app
PORT=8080
LOG_LEVEL=info
ENABLE_SCHEDULER=true

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Deployment Options

### Option 1: Docker Container Deployment (Recommended)

#### Build and Deploy
```bash
# Build the production image
docker build -t medical-app-prod:latest .

# Create deployment directory
mkdir -p deployment
cp docker-compose.prod.yml deployment/
cp .env.production deployment/

# Deploy using Docker Compose
cd deployment
docker-compose -f docker-compose.prod.yml up -d
```

#### Verify Deployment
```bash
# Check container status
docker ps

# View logs
docker logs medical-app-prod-app-1

# Health check
curl http://localhost:8080/health

# API status
curl http://localhost:8080/api/status
```

### Option 2: Firebase Hosting Deployment

#### Setup Firebase
```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init hosting

# Select your Firebase project
# Choose "Use an existing project"
# Configure as single-page app: Yes
# Set public directory: dist
# Configure automatic builds: No
```

#### Build and Deploy
```bash
# Install dependencies
npm ci --only=production

# Build frontend
npm run build:prod

# Deploy to Firebase
firebase deploy --only hosting
```

#### Verify Firebase Deployment
- Open your Firebase Console
- Navigate to Hosting section
- Check deployment status and URL
- Test the application at your Firebase URL

## Production Configuration

### Security Headers

The application includes security headers configured in `firebase.json`:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- X-Content-Type-Options: nosniff

### Rate Limiting
- Default: 10 requests per second
- Configurable via `RATE_LIMIT_QPS` environment variable
- Burst capacity: 10 requests

### CORS Configuration
- Configured for Firebase Hosting domain
- Allows GET, POST, OPTIONS methods
- Secure headers exposure

## Monitoring and Health Checks

### Available Endpoints
- `GET /health` - Application health status
- `GET /metrics` - Basic performance metrics
- `GET /api/status` - Comprehensive API status with database statistics

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": 1672531200.123,
  "database": "connected",
  "version": "1.0.0",
  "environment": "production"
}
```

## Database Management

### Production Database
- SQLite database with persistent storage
- Automatic backup via Docker volumes
- Located at `./data/medical.db` in production

### Database Migrations
```bash
# Apply database schema updates
python -c "from main import Base, engine; Base.metadata.create_all(bind=engine)"
```

## Performance Optimization

### Frontend Optimization
- Vite build with code splitting
- Asset compression and caching
- Service worker for offline functionality
- Gzip compression for static assets

### Backend Optimization
- Docker multi-stage build
- Python slim base image
- Optimized dependency installation
- Proper process management

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database file permissions
   ls -la ./data/medical.db
   
   # Repair database (if needed)
   sqlite3 ./data/medical.db "VACUUM;"
   ```

2. **Firebase Deployment Errors**
   ```bash
   # Clear Firebase cache
   firebase cache:clear
   
   # Check Firebase project configuration
   firebase projects:list
   ```

3. **Docker Container Issues**
   ```bash
   # Check container logs
   docker logs <container_id>
   
   # Restart containers
   docker-compose -f docker-compose.prod.yml restart
   ```

### Logging
- Application logs: `./logs/app.log`
- Docker logs: `docker logs <container_id>`
- Firebase logs: Firebase Console → Hosting → Logs

## Maintenance

### Regular Tasks
- Monitor application health endpoints
- Check database size and performance
- Review application logs
- Update dependencies regularly
- Backup database periodically

### Backup Procedures
```bash
# Database backup
sqlite3 ./data/medical.db ".backup backup/medical.db.$(date +%Y%m%d).bak"

# Configuration backup
tar -czf backup/config.$(date +%Y%m%d).tar.gz .env.production docker-compose.prod.yml
```

## Support

For production issues:
1. Check application logs
2. Verify environment variables
3. Test health endpoints
4. Review monitoring metrics
5. Contact development team if issues persist

---

*Last Updated: $(date +%Y-%m-%d)*
*Version: 1.0.0*