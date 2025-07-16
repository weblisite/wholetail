# Wholetail Deployment Guide

## 🚀 Production Deployment

This guide covers deploying the complete Wholetail B2B procurement platform to production.

## ✅ Pre-Deployment Checklist

### Core Systems Verified ✅
- [x] **Authentication System** - Multi-role user management (Retailer, Wholesaler, Financier)
- [x] **Product Catalog** - Product listings, categories, inventory management
- [x] **Order Management** - Complete order lifecycle from creation to delivery
- [x] **M-Pesa Payments** - STK Push, 3% commission processing, real-time callbacks
- [x] **Mapping & GPS** - Geocoding, distance calculation, delivery tracking
- [x] **Logistics System** - Fleet management, route optimization, driver tracking
- [x] **Notifications** - SMS (Twilio), Email (SendGrid), WhatsApp multi-channel
- [x] **Confidence Scoring** - AI-powered credit assessment for retailer financing

### API Testing Results ✅
```
Backend Health: ✅ http://localhost:3001/api/health
Frontend: ✅ http://localhost:3000
Products API: ✅ 3 products loaded
Confidence Scores: ✅ 3 retailers assessed
Logistics Fleet: ✅ 3 vehicles managed
Notifications: ✅ 3 notifications sent
Payments: ✅ KSh 45,000 processed
Location Services: ✅ Geocoding functional
```

## 📋 Environment Configuration

### Backend Environment Variables (.env)
```bash
# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_BUSINESS_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/callback
MPESA_TIMEOUT_URL=https://your-domain.com/api/payments/timeout

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Notifications
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number

SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SENDGRID_FROM_NAME=Wholetail

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
```

### Frontend Environment Variables (.env.production)
```bash
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Wholetail
REACT_APP_VERSION=1.0.0
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_SUPPORT_EMAIL=support@your-domain.com
REACT_APP_COMPANY_WEBSITE=https://your-domain.com
```

## 🔧 Deployment to Vercel

### 1. Prerequisites
```bash
npm install -g vercel
vercel login
```

### 2. Build Configuration
The project includes `vercel.json` with optimized settings:
- Frontend: Static build with React
- Backend: Serverless Node.js functions
- Routes: API calls routed to backend, everything else to frontend

### 3. Deploy Command
```bash
# From project root
vercel --prod

# Or deploy with custom domain
vercel --prod --alias your-domain.com
```

### 4. Environment Variables Setup
In Vercel dashboard, add all environment variables listed above under:
Project Settings → Environment Variables

### 5. Custom Domain Configuration
1. Go to Vercel dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., wholetail.com)
3. Configure DNS records as instructed by Vercel

## 🗄️ Database Setup (Supabase)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your Project URL and anon key

### 2. Run Database Schema
Execute the SQL in `supabase-schema.sql`:
```sql
-- Creates all necessary tables for:
-- Users, Products, Orders, Payments, Notifications, etc.
```

### 3. Enable Row Level Security
Configure RLS policies for data protection:
```sql
-- Enable RLS on all tables
-- Configure user-based access policies
```

## 🔐 Security Configuration

### 1. API Rate Limiting
- Configured: 100 requests per 15 minutes per IP
- Helmet.js enabled for security headers
- CORS configured for your domain

### 2. Environment Security
- All sensitive keys in environment variables
- No hardcoded credentials in code
- Production/development environment separation

### 3. Database Security
- Row Level Security enabled
- User-based data access policies
- Encrypted connections only

## 📱 Third-Party Service Setup

### 1. M-Pesa Integration (Safaricom)
1. Register for Daraja API access
2. Get Consumer Key and Consumer Secret
3. Configure STK Push settings
4. Set callback URLs to your domain

### 2. Google Maps Setup
1. Enable Google Maps JavaScript API
2. Enable Geocoding API
3. Enable Places API
4. Restrict API key to your domain

### 3. Twilio (SMS & WhatsApp)
1. Create Twilio account
2. Get phone number for SMS
3. Set up WhatsApp Business API
4. Configure webhook URLs

### 4. SendGrid (Email)
1. Create SendGrid account
2. Verify sender email domain
3. Get API key
4. Configure email templates

## 🧪 Post-Deployment Testing

### 1. Smoke Tests
```bash
# Test key endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/products
curl https://your-domain.com/api/confidence/scores
```

### 2. Feature Testing
- [ ] User registration and login
- [ ] Product browsing and search
- [ ] Order creation and tracking
- [ ] Payment processing (test mode)
- [ ] Notification delivery
- [ ] Confidence score calculation

### 3. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

## 📊 Monitoring & Analytics

### 1. Error Tracking
- Vercel automatic error reporting
- Custom error logging for critical paths
- Email alerts for system failures

### 2. Performance Monitoring
- Vercel Analytics for frontend performance
- API response time tracking
- Database query performance

### 3. Business Metrics
- Order volume and success rates
- Payment processing statistics
- User engagement metrics
- Confidence score distributions

## 🔄 CI/CD Pipeline

### 1. Automatic Deployments
- Connect GitHub repository to Vercel
- Auto-deploy on push to main branch
- Preview deployments for pull requests

### 2. Testing Pipeline
```bash
# Frontend tests
cd wholetail-frontend && npm test

# Backend tests
cd wholetail-backend && npm test

# E2E tests
npm run test:e2e
```

## 🚨 Troubleshooting

### Common Issues
1. **Build Failures**: Check Node.js version compatibility
2. **API Errors**: Verify environment variables are set
3. **Database Connection**: Confirm Supabase credentials
4. **Payment Issues**: Check M-Pesa sandbox vs production settings

### Debug Commands
```bash
# Check build logs
vercel logs

# Test local production build
cd wholetail-frontend && npm run build && serve -s build
cd wholetail-backend && NODE_ENV=production node server.js
```

## 📞 Support

For deployment support:
- Email: dev@wholetail.com
- Documentation: This deployment guide
- Emergency: Check Vercel dashboard for real-time status

---

**🎉 Congratulations! Your Wholetail B2B platform is ready for production!**

## Feature Summary
- ✅ **8 Major Systems** fully implemented and tested
- ✅ **Real-time APIs** for all business operations  
- ✅ **Production-ready** with proper security and monitoring
- ✅ **Scalable architecture** on Vercel serverless platform
- ✅ **Mobile-responsive** design for all user types
- ✅ **AI-powered** confidence scoring for financial decisions 