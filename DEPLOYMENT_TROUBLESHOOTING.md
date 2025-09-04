# Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Frontend Build Issues

#### Issue: Large bundle size warning
**Solution:** The build now includes better code splitting. If you still see warnings:
```bash
# Check bundle analyzer
npm run build:analyze  # If you have this script
```

#### Issue: NODE_ENV warning in Vite
**Solution:** This is just a warning and doesn't affect functionality. The build will work correctly.

#### Issue: Missing environment variables
**Solution:** Create a `.env.production` file with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### 2. Backend Issues

#### Issue: Backend won't start
**Solution:** Check Python dependencies:
```bash
pip install -r requirements.txt
python main.py
```

#### Issue: Database connection errors
**Solution:** The app uses SQLite by default. Make sure the `medical.db` file is writable.

#### Issue: Missing configuration
**Solution:** The app will use default values. For production, set environment variables:
```bash
export JWT_SECRET_KEY="your-secret-key"
export OPENFDA_API_KEY="your-api-key"
```

### 3. Docker Issues

#### Issue: Docker Desktop not running
**Solution:** 
1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
2. Start Docker Desktop
3. Wait for it to fully start (green icon in system tray)

#### Issue: Docker build fails
**Solution:** Use the simplified docker-compose:
```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

#### Issue: Port conflicts
**Solution:** Check if ports 80, 8080 are in use:
```bash
netstat -an | findstr ":80"
netstat -an | findstr ":8080"
```

### 4. Firebase Issues

#### Issue: Firebase CLI not found
**Solution:** Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
```

#### Issue: Firebase project not configured
**Solution:** Initialize Firebase:
```bash
firebase init
# Select hosting and functions
```

#### Issue: Build fails before Firebase deploy
**Solution:** Build manually first:
```bash
npm run build
firebase deploy
```

### 5. Environment-Specific Issues

#### Development Environment
- Use `npm run dev` for frontend
- Use `python main.py` for backend
- Access at http://localhost:3000 and http://localhost:8000

#### Production Environment
- Use `npm run build` then `firebase deploy`
- Or use Docker: `docker-compose -f docker-compose.dev.yml up -d`

### 6. Quick Fixes

#### Reset everything:
```bash
# Stop all services
docker-compose down
taskkill /f /im python.exe  # Windows
pkill -f python  # Linux/Mac

# Clean build
npm run build
python main.py
```

#### Check service status:
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if frontend is accessible
curl http://localhost:3000
```

### 7. Performance Issues

#### Frontend is slow:
- Check browser dev tools for errors
- Clear browser cache
- Check network tab for failed requests

#### Backend is slow:
- Check database file size
- Monitor memory usage
- Check for error logs

### 8. Security Issues

#### CORS errors:
- Check `config.py` for CORS settings
- Ensure frontend and backend URLs match

#### Authentication errors:
- Check JWT secret key configuration
- Verify API keys are set correctly

## Getting Help

If you're still having issues:

1. Check the logs:
   ```bash
   # Backend logs
   python main.py  # Run in foreground to see logs
   
   # Docker logs
   docker-compose logs
   ```

2. Verify your environment:
   ```bash
   # Check Node.js version
   node --version
   
   # Check Python version
   python --version
   
   # Check Docker
   docker --version
   ```

3. Test individual components:
   ```bash
   # Test frontend build
   npm run build
   
   # Test backend
   python -c "import main; print('Backend imports OK')"
   ```

## Deployment Options

### Option 1: Local Development
```bash
# Terminal 1: Backend
python main.py

# Terminal 2: Frontend
npm run dev
```

### Option 2: Firebase Hosting
```bash
npm run build
firebase deploy
```

### Option 3: Docker
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Option 4: Manual Production
```bash
# Build frontend
npm run build

# Serve with any web server
# Backend runs separately
python main.py
```
