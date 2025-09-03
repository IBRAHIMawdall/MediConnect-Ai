# Firebase Deployment Guide

This guide will help you deploy the Medical Information App to Firebase, including hosting, Cloud Functions, and Firestore configuration.

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed (for Cloud Functions)
- Firebase CLI installed
- A Firebase project created in the [Firebase Console](https://console.firebase.google.com)

## Quick Start

### 1. Initialize Firebase Project

Run the initialization script to set up your Firebase project:

```powershell
# Windows PowerShell
.\scripts\firebase-init.ps1 -ProjectId "your-project-id"

# With custom settings
.\scripts\firebase-init.ps1 -ProjectId "your-project-id" -ProjectName "My Medical App" -Region "us-central1"
```

### 2. Configure Environment Variables

Update the `.env` file with your Firebase configuration:

```env
# Get these values from Firebase Console > Project Settings > General
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Deploy to Firebase

```bash
# Deploy everything
npm run firebase:deploy

# Deploy specific services
npm run firebase:deploy:hosting
npm run firebase:deploy:functions
npm run firebase:deploy:firestore
```

## Detailed Setup

### Firebase Project Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Required Services**
   - **Authentication**: Enable Email/Password, Google, and other providers
   - **Firestore**: Create a database in production mode
   - **Storage**: Set up Firebase Storage
   - **Hosting**: Enable Firebase Hosting
   - **Functions**: Enable Cloud Functions

3. **Configure Authentication Providers**
   ```
   Firebase Console > Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google (configure OAuth consent screen)
   - Enable other providers as needed
   ```

### Local Development with Emulators

1. **Start Firebase Emulators**
   ```bash
   npm run firebase:emulators
   ```

2. **Access Emulator UI**
   - Open http://localhost:4000
   - View and manage emulated services

3. **Emulator Ports**
   - Auth: http://localhost:9099
   - Firestore: http://localhost:8080
   - Functions: http://localhost:5001
   - Hosting: http://localhost:5000
   - Storage: http://localhost:9199

### Cloud Functions Setup

1. **Install Python Dependencies**
   ```bash
   cd functions
   pip install -r requirements.txt
   ```

2. **Deploy Functions**
   ```bash
   npm run firebase:deploy:functions
   ```

3. **Test Functions Locally**
   ```bash
   firebase emulators:start --only functions
   ```

### Firestore Configuration

1. **Security Rules**
   - Rules are defined in `firestore.rules`
   - Deploy with: `npm run firebase:deploy:firestore`

2. **Indexes**
   - Composite indexes are defined in `firestore.indexes.json`
   - Single-field indexes are created automatically

3. **Data Structure**
   ```
   /users/{userId}
   /drugs/{drugId}
   /diagnoses/{diagnosisId}
   /reviews/{reviewId}
   /analytics/{analyticsId}
   ```

### Storage Configuration

1. **Security Rules**
   - Rules are defined in `storage.rules`
   - Organized by user access and file types

2. **File Organization**
   ```
   /users/{userId}/profile/
   /users/{userId}/documents/
   /drugs/{drugId}/images/
   /medical/images/{category}/
   ```

## Deployment Scripts

### Available NPM Scripts

```bash
# Firebase CLI commands
npm run firebase:login          # Login to Firebase
npm run firebase:init           # Initialize Firebase project
npm run firebase:deploy         # Deploy everything
npm run firebase:deploy:hosting # Deploy hosting only
npm run firebase:deploy:functions # Deploy functions only
npm run firebase:deploy:firestore # Deploy Firestore rules
npm run firebase:serve          # Serve locally
npm run firebase:emulators      # Start emulators
```

### PowerShell Deployment Script

```powershell
# Full deployment
.\deployment\deploy-firebase.ps1

# Production deployment
.\deployment\deploy-firebase.ps1 -Environment production

# Deploy specific services
.\deployment\deploy-firebase.ps1 -OnlyHosting
.\deployment\deploy-firebase.ps1 -OnlyFunctions
.\deployment\deploy-firebase.ps1 -OnlyFirestore

# Start emulators
.\deployment\deploy-firebase.ps1 -UseEmulators
```

## CI/CD with GitHub Actions

### Setup GitHub Secrets

1. **Firebase Service Account**
   ```bash
   # Generate service account key
   firebase projects:list
   firebase service-accounts:create github-actions
   firebase service-accounts:keys:create github-actions-key.json --account github-actions@your-project.iam.gserviceaccount.com
   ```

2. **Add to GitHub Secrets**
   - `FIREBASE_SERVICE_ACCOUNT_DEV`: Service account JSON for development
   - `FIREBASE_SERVICE_ACCOUNT_PROD`: Service account JSON for production
   - `FIREBASE_PROJECT_ID_DEV`: Development project ID
   - `FIREBASE_PROJECT_ID_PROD`: Production project ID

### Workflow Triggers

- **Development**: Pushes to `develop` branch
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests to `main` branch
- **Manual**: Workflow dispatch with environment selection

## Environment Configuration

### Development Environment

```env
VITE_NODE_ENV=development
VITE_USE_FIREBASE_EMULATORS=true
VITE_ENABLE_ANALYTICS=false
VITE_API_BASE_URL=http://localhost:5001/your-project-dev/us-central1
```

### Production Environment

```env
VITE_NODE_ENV=production
VITE_USE_FIREBASE_EMULATORS=false
VITE_ENABLE_ANALYTICS=true
VITE_API_BASE_URL=https://us-central1-your-project-prod.cloudfunctions.net
```

## Security Best Practices

### Environment Variables

- Never commit `.env` files to version control
- Use different Firebase projects for dev/staging/production
- Rotate API keys regularly
- Use Firebase App Check for production

### Firestore Security

- Implement proper security rules
- Use authentication for all sensitive data
- Validate data on both client and server
- Implement rate limiting

### Cloud Functions Security

- Use HTTPS callable functions for sensitive operations
- Implement proper authentication checks
- Validate all input parameters
- Use environment variables for secrets

## Monitoring and Analytics

### Firebase Analytics

- Automatically tracks user engagement
- Custom events for medical data interactions
- Conversion tracking for key actions

### Performance Monitoring

- Automatic performance tracking
- Custom traces for critical user flows
- Network request monitoring

### Error Reporting

- Crashlytics for error tracking
- Custom error logging in Cloud Functions
- User feedback integration

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check Firestore security rules
   - Verify user authentication
   - Ensure proper IAM roles

2. **Function Deployment Failures**
   - Check Python version compatibility
   - Verify requirements.txt dependencies
   - Check function timeout settings

3. **Hosting Issues**
   - Verify build output in `dist/` directory
   - Check firebase.json hosting configuration
   - Ensure proper rewrites for SPA routing

### Debug Commands

```bash
# Check Firebase project status
firebase projects:list
firebase use

# View deployment logs
firebase functions:log

# Test security rules
firebase firestore:rules:test

# Validate configuration
firebase deploy --dry-run
```

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- [GitHub Issues](https://github.com/your-repo/issues)

## License

This project is licensed under the MIT License - see the LICENSE file for details.