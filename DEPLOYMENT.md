# Wholetail Deployment Guide - Render

This guide will help you deploy the Wholetail application on Render.

## Prerequisites

1. A Render account (free tier available)
2. Your Supabase project credentials
3. GitHub repository access

## Deployment Steps

### 1. Backend Deployment

1. **Connect to GitHub:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub account
   - Select the `wholetail` repository

2. **Configure Backend Service:**
   - **Name:** `wholetail-backend`
   - **Root Directory:** `wholetail-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

3. **Environment Variables:**
   ```
   NODE_ENV=production
   SUPABASE_URL=https://jtgsvwucbrvrjlrbnycn.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Z3N2d3VjYnJ2cmpscmJueWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTYwMzgsImV4cCI6MjA2Nzg5MjAzOH0.QE59rPjGeEr8_Lem5_K_WUtNlBYqpSaV2pWIMeoac_s
   SUPABASE_SERVICE_ROLE_KEY=sbp_7e9c86ebfdf99515e2e6335aee93b1c41b835474
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```

4. **Health Check Path:** `/api/health`

### 2. Frontend Deployment

1. **Create Static Site:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Static Site"
   - Connect your GitHub account
   - Select the `wholetail` repository

2. **Configure Frontend Service:**
   - **Name:** `wholetail-frontend`
   - **Root Directory:** `wholetail-frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`

3. **Environment Variables:**
   ```
   REACT_APP_SUPABASE_URL=https://jtgsvwucbrvrjlrbnycn.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Z3N2d3VjYnJ2cmpscmJueWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMTYwMzgsImV4cCI6MjA2Nzg5MjAzOH0.QE59rPjGeEr8_Lem5_K_WUtNlBYqpSaV2pWIMeoac_s
   REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

### 3. Update Frontend Backend URL

After deploying the backend, update the `REACT_APP_BACKEND_URL` in the frontend environment variables with your backend URL.

### 4. Custom Domain (Optional)

1. **Add Custom Domain:**
   - Go to your service settings
   - Click "Custom Domains"
   - Add your domain
   - Update DNS records as instructed

2. **SSL Certificate:**
   - Render automatically provides SSL certificates
   - No additional configuration needed

## Environment Variables Reference

### Backend Variables
- `NODE_ENV`: Set to `production`
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `FRONTEND_URL`: Your frontend URL (for CORS)

### Frontend Variables
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `REACT_APP_BACKEND_URL`: Your backend API URL
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Your Google Maps API key

## Monitoring & Logs

1. **View Logs:**
   - Go to your service dashboard
   - Click "Logs" tab
   - Monitor for any errors

2. **Health Checks:**
   - Backend health check: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status":"OK","message":"Wholetail API is running"}`

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check build logs for missing dependencies
   - Ensure all environment variables are set

2. **CORS Errors:**
   - Verify `FRONTEND_URL` is set correctly in backend
   - Check that frontend URL matches exactly

3. **Database Connection Issues:**
   - Verify Supabase credentials
   - Check if Supabase project is active

4. **Environment Variables:**
   - Ensure all required variables are set
   - Check for typos in variable names

### Support

- Render Documentation: https://render.com/docs
- Render Support: https://render.com/support

## Security Notes

1. **Environment Variables:**
   - Never commit sensitive keys to Git
   - Use Render's environment variable system
   - Rotate keys regularly

2. **CORS Configuration:**
   - Only allow necessary origins
   - Use HTTPS in production

3. **Rate Limiting:**
   - Backend includes rate limiting
   - Monitor for abuse

## Performance Optimization

1. **Caching:**
   - Enable Render's CDN for static assets
   - Consider implementing API caching

2. **Database:**
   - Monitor Supabase usage
   - Optimize queries for production

3. **Monitoring:**
   - Set up alerts for downtime
   - Monitor response times 