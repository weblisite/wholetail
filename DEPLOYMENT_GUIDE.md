# 🚀 Wholetail Platform Deployment Guide

## Quick Start (Development)

```bash
# Clone and setup
git clone <repository-url>
cd Wholetail

# Install dependencies
npm install

# Start both frontend and backend
npm start

# Access the platform
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
```

## 📋 Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Git**: Latest version

### Environment Setup
1. **Clerk Authentication** (Required)
   - Create account at [clerk.com](https://clerk.com)
   - Get API keys for frontend and backend
   
2. **Database** (Optional - Mock data available)
   - Supabase account and project
   - OR use mock data for development

3. **External Services** (Optional)
   - Twilio for SMS campaigns
   - Google Maps API for location services
   - M-Pesa API for payments

## 🔧 Environment Configuration

### Frontend Environment (`.env` in `wholetail-frontend/`)
```env
# Clerk Authentication
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_live_or_test_...

# API Configuration
REACT_APP_BACKEND_URL=http://localhost:3001/api
REACT_APP_API_URL=http://localhost:3001

# Feature Flags
REACT_APP_MOCK_DATA=true
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ADVANCED_FEATURES=true
```

### Backend Environment (`.env` in `wholetail-backend/`)
```env
# Server Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_live_or_test_...
CLERK_SECRET_KEY=sk_live_or_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database (Optional - Uses mock data if not configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External Services (Optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

GOOGLE_MAPS_API_KEY=your-google-maps-key

# M-Pesa Configuration (Optional)
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_ENVIRONMENT=sandbox
```

## 🏗️ Development Setup

### 1. Install Dependencies
```bash
# Root dependencies
npm install

# Frontend dependencies
cd wholetail-frontend && npm install

# Backend dependencies
cd ../wholetail-backend && npm install
cd ..
```

### 2. Configure Authentication
```bash
# Set up Clerk
# 1. Visit https://clerk.com and create an account
# 2. Create a new application
# 3. Copy the publishable key to frontend .env
# 4. Copy the secret key to backend .env
# 5. Configure allowed redirect URLs in Clerk dashboard
```

### 3. Start Development Servers
```bash
# Option 1: Start both services together
npm start

# Option 2: Start individually
npm run start:frontend  # React dev server
npm run start:backend   # Express API server
```

### 4. Verify Installation
```bash
# Test API endpoints
node test-api-endpoints.js

# Check frontend
open http://localhost:3000

# Check backend health
curl http://localhost:3001/api/health
```

## 🧪 Testing

### API Integration Tests
```bash
# Test all endpoints
npm run test:system

# Test individual components
npm run test:frontend
npm run test:backend

# Run custom API tests
node test-api-endpoints.js
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Dashboard data loading
- [ ] Product browsing and search
- [ ] Order creation and management
- [ ] Recommendation system
- [ ] Analytics dashboards
- [ ] Financing features

## 🌐 Production Deployment

### Platform Options

#### 1. Vercel (Recommended for full-stack)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment variables are configured in Vercel dashboard
```

#### 2. Railway (Easy deployment)
```bash
# Connect GitHub repository to Railway
# Environment variables configured in Railway dashboard
# Automatic deployments on push
```

#### 3. Heroku (Traditional PaaS)
```bash
# Install Heroku CLI
heroku create wholetail-api
heroku create wholetail-frontend

# Configure environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### 4. AWS/GCP/Azure (Custom setup)
- Use Docker containers
- Configure load balancers
- Set up database connections
- Configure CDN for static assets

### Production Environment Variables
```env
# Set these in your deployment platform
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_...
SUPABASE_URL=https://production-project.supabase.co
# ... other production keys
```

## 🔒 Security Considerations

### Authentication
- ✅ Clerk handles user authentication
- ✅ JWT tokens for API authorization
- ✅ Role-based access control implemented
- ✅ Secure password policies

### API Security
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Input validation on all endpoints
- ✅ Error messages don't leak sensitive data

### Infrastructure
- [ ] HTTPS enabled in production
- [ ] Environment variables secure
- [ ] Database access restricted
- [ ] API keys rotated regularly

## 📊 Monitoring & Analytics

### Health Monitoring
```bash
# Health check endpoint
GET /api/health

# Response format
{
  "status": "OK",
  "message": "Wholetail API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Performance Monitoring
- API response times
- Database query performance
- Frontend loading times
- Error rates and patterns

### Business Analytics
- User engagement metrics
- Transaction volumes
- Feature usage statistics
- Revenue tracking

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```bash
# Check Clerk configuration
echo $CLERK_SECRET_KEY
echo $REACT_APP_CLERK_PUBLISHABLE_KEY

# Verify webhook setup
curl -X POST http://localhost:3001/api/auth/webhook/user-created
```

#### 2. Database Connection Issues
```bash
# Test Supabase connection
curl "https://your-project.supabase.co/rest/v1/users" \
  -H "apikey: your-anon-key"

# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### 3. CORS Issues
```javascript
// Backend CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

#### 4. Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run clean
npm run build
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run start:backend

# Frontend debug mode
REACT_APP_DEBUG=true npm run start:frontend
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Database read replicas
- CDN for static assets
- Microservices architecture

### Vertical Scaling
- Server resource allocation
- Database optimization
- Caching strategies
- Background job processing

### Performance Optimization
- API response caching
- Database query optimization
- Frontend code splitting
- Image optimization

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy Wholetail Platform

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: node test-api-endpoints.js

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Monitor security vulnerabilities
- [ ] Review API usage patterns
- [ ] Backup database regularly
- [ ] Rotate API keys quarterly

### Getting Help
1. Check the logs for error details
2. Run the API test suite
3. Verify environment configuration
4. Check service status pages (Clerk, Supabase, etc.)
5. Review the integration report

---

**🎉 Your Wholetail platform is ready for deployment!**

The platform has been thoroughly tested and integrated. All frontend API calls have corresponding backend implementations, and the system is production-ready with minimal configuration required.