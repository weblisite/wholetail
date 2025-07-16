# Wholetail Production Environment Configuration

This guide provides comprehensive instructions for setting up Wholetail in production.

## Required Environment Variables

Create a `.env` file in the `wholetail-backend` directory with these variables:

```bash
# ==============================================
# SUPABASE CONFIGURATION
# ==============================================
# Get these from your Supabase project dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ==============================================
# M-PESA CONFIGURATION (Safaricom Kenya)
# ==============================================
# Get these from Safaricom Developer Portal
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_PASSKEY=your-mpesa-passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_SANDBOX=false
MPESA_TIMEOUT_URL=https://yourdomain.com/api/mpesa/timeout

# ==============================================
# GOOGLE MAPS API CONFIGURATION
# ==============================================
# Get from Google Cloud Console
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
# Enable these APIs: Geocoding, Distance Matrix, Places, Maps JavaScript

# ==============================================
# TWILIO SMS CONFIGURATION
# ==============================================
# Get from Twilio Console
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+254700000000
TWILIO_MESSAGING_SERVICE_SID=your-messaging-service-sid

# ==============================================
# SENDGRID EMAIL CONFIGURATION
# ==============================================
# Get from SendGrid Dashboard
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@wholetail.co.ke
SENDGRID_FROM_NAME=Wholetail Platform

# ==============================================
# WHATSAPP BUSINESS API CONFIGURATION
# ==============================================
# Get from Meta Business Developer Console
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Security settings
JWT_SECRET=your-super-secure-jwt-secret-key-change-this
SESSION_SECRET=your-super-secure-session-secret-change-this
ENCRYPTION_KEY=your-32-character-encryption-key

# ==============================================
# DELIVERY PRICING CONFIGURATION
# ==============================================
BASE_WEIGHT_LIMIT=90
BASE_DELIVERY_FEE=300
ADDITIONAL_DISTANCE_FEE=100
DISTANCE_THRESHOLD=100

# ==============================================
# BUSINESS CONFIGURATION
# ==============================================
PLATFORM_COMMISSION_RATE=0.03
FINANCING_COMMISSION_RATE=0.03
COMPANY_NAME=Wholetail Ltd
COMPANY_ADDRESS=Nairobi, Kenya
COMPANY_PHONE=+254700000000
COMPANY_EMAIL=support@wholetail.co.ke

# ==============================================
# DOMAIN CONFIGURATION
# ==============================================
DOMAIN=wholetail.co.ke
FRONTEND_DOMAIN=https://wholetail.co.ke
API_DOMAIN=https://api.wholetail.co.ke
```

## Frontend Environment Variables

Create a `.env` file in the `wholetail-frontend` directory:

```bash
# ==============================================
# REACT APP CONFIGURATION
# ==============================================
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_API_URL=https://api.wholetail.co.ke
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# ==============================================
# PRODUCTION SETTINGS
# ==============================================
REACT_APP_ENV=production
REACT_APP_SENTRY_DSN=your-sentry-dsn
REACT_APP_GOOGLE_ANALYTICS_ID=your-ga-id
```

## Setup Instructions

### 1. Supabase Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Settings > API to get your URL and keys
3. Execute the schema in `supabase-schema.sql`:
   ```bash
   # In Supabase SQL Editor, paste and execute the entire schema
   ```
4. Set up Row Level Security policies in the Supabase dashboard
5. Create storage buckets:
   - `product-images`
   - `documents`
   - `receipts`

### 2. M-Pesa Integration Setup

1. Register at https://developer.safaricom.co.ke
2. Create an app and get credentials
3. Set up callback URLs for production
4. Test with sandbox first, then switch to production

### 3. Google Maps API Setup

1. Go to Google Cloud Console
2. Enable these APIs:
   - Geocoding API
   - Distance Matrix API
   - Places API
   - Maps JavaScript API
3. Create API key and set restrictions
4. Set up billing account

### 4. SMS/Email/WhatsApp Setup

**Twilio (SMS):**
1. Sign up at https://twilio.com
2. Get Account SID and Auth Token
3. Purchase a Kenyan phone number

**SendGrid (Email):**
1. Sign up at https://sendgrid.com
2. Create API key
3. Verify sender identity

**WhatsApp Business API:**
1. Apply for WhatsApp Business API access
2. Set up webhook endpoints
3. Configure message templates

### 5. Domain and SSL Setup

1. Register `wholetail.co.ke` domain
2. Configure DNS records:
   ```
   A record: @ -> Vercel IP
   CNAME: api -> backend-url
   CNAME: www -> @
   ```
3. Set up SSL certificates (automatic with Vercel)

### 6. Deployment on Vercel

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Configure build settings:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "build",
     "installCommand": "npm install"
   }
   ```

### 7. Security Checklist

- [ ] Enable HTTPS only
- [ ] Set up CORS properly
- [ ] Configure rate limiting
- [ ] Set strong JWT secrets
- [ ] Enable Supabase RLS
- [ ] Validate all inputs
- [ ] Set up monitoring (Sentry)

### 8. Monitoring and Analytics

- [ ] Set up error tracking (Sentry)
- [ ] Configure Google Analytics
- [ ] Set up uptime monitoring
- [ ] Enable API logging
- [ ] Set up backup procedures

### 9. Testing Checklist

- [ ] Test all payment flows
- [ ] Verify SMS/email delivery
- [ ] Test maps functionality
- [ ] Check all API endpoints
- [ ] Verify mobile responsiveness
- [ ] Test user authentication

### 10. Go-Live Steps

1. Switch M-Pesa to production mode
2. Update all callback URLs
3. Test complete user journeys
4. Monitor logs and performance
5. Set up customer support channels

## Performance Optimization

### Database Optimization
- Ensure all indexes are created
- Monitor query performance
- Set up connection pooling
- Regular backup schedule

### Frontend Optimization
- Enable CDN for static assets
- Implement code splitting
- Optimize images
- Use React.memo where needed

### API Optimization
- Implement response caching
- Use compression middleware
- Monitor API response times
- Set up health checks

## Maintenance

### Daily
- Monitor error logs
- Check system performance
- Review transaction volumes

### Weekly
- Database health check
- Backup verification
- Security updates

### Monthly
- Performance review
- User feedback analysis
- Feature usage analytics
- Cost optimization review

## Support Contacts

- **Technical Support**: tech@wholetail.co.ke
- **Business Support**: business@wholetail.co.ke
- **Emergency**: +254700000000

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke)
- [Google Maps API Documentation](https://developers.google.com/maps)
- [Vercel Deployment Guide](https://vercel.com/docs) 