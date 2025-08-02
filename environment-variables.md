# Environment Variables Configuration

After migrating from Supabase to Neon + Clerk, you'll need to set up the following environment variables:

## Backend Environment Variables

Create a `.env` file in the `wholetail-backend` directory:

```bash
# Neon Database Configuration
NEON_DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Clerk Authentication (Backend)
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Cloudinary Configuration (for file storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SendGrid Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

## Frontend Environment Variables

Create a `.env` file in the `wholetail-frontend` directory:

```bash
# Clerk Authentication (Frontend)
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# Backend API URL
REACT_APP_API_URL=http://localhost:3001

# Google Maps API (if used in frontend)
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Setup Instructions

### 1. Neon Database Setup
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string
4. Run the schema migration: `psql "your_connection_string" -f neon-schema.sql`

### 2. Clerk Authentication Setup
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Copy the publishable key and secret key
4. Configure webhook endpoints:
   - Endpoint URL: `https://your-domain.com/api/auth/webhook/user-created`
   - Events: `user.created`

### 3. Cloudinary Setup (for file storage)
1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Create an account
3. Copy your cloud name, API key, and API secret

### 4. Other Services
Configure the remaining services (SendGrid, Google Maps, Twilio, M-Pesa) as needed.

## Migration Notes

- **Database**: User IDs are now strings (Clerk user IDs) instead of UUIDs
- **Authentication**: All auth flows now go through Clerk
- **File Storage**: Moved from Supabase Storage to Cloudinary
- **User Registration**: Two-step process - Clerk signup + profile completion