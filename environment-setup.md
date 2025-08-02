# 🔧 Environment Setup Guide

## Quick Setup for Development

Create the following environment files:

### 1. Frontend Environment (`wholetail-frontend/.env`)
```env
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
REACT_APP_BACKEND_URL=http://localhost:3001/api
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MOCK_DATA=true
```

### 2. Backend Environment (`wholetail-backend/.env`)
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Optional - leave blank to use mock data
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## Authentication Setup (Required)

1. Visit [Clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Copy the keys to your environment files
4. Set redirect URLs in Clerk dashboard:
   - `http://localhost:3000/auth/login`
   - `http://localhost:3000/auth/register`

## Start Development

```bash
npm install
npm start
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

The platform will work with mock data immediately after setup!