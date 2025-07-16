#!/bin/bash

# Wholetail Production Deployment Script
# This script helps deploy Wholetail to production with all necessary configurations

set -e

echo "🚀 Wholetail Production Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "git is not installed"
        exit 1
    fi
    
    print_status "Prerequisites check passed ✅"
}

# Environment setup
setup_environment() {
    print_step "Setting up environment variables..."
    
    # Backend environment
    if [ ! -f "wholetail-backend/.env" ]; then
        print_warning "Backend .env file not found. Creating template..."
        cp wholetail-backend/production-config.md wholetail-backend/.env.template
        print_warning "Please configure wholetail-backend/.env with your production values"
        print_warning "See production-config.md for detailed instructions"
    fi
    
    # Frontend environment
    if [ ! -f "wholetail-frontend/.env" ]; then
        print_warning "Frontend .env file not found. Creating template..."
        cat > wholetail-frontend/.env.template << EOF
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_API_URL=https://api.wholetail.co.ke
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_ENV=production
EOF
        print_warning "Please configure wholetail-frontend/.env with your production values"
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd wholetail-backend
    npm install --production
    cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd wholetail-frontend
    npm install
    cd ..
    
    print_status "Dependencies installed ✅"
}

# Build frontend
build_frontend() {
    print_step "Building frontend for production..."
    
    cd wholetail-frontend
    
    # Check if environment variables are set
    if [ ! -f ".env" ]; then
        print_error "Frontend .env file not found. Please create it first."
        exit 1
    fi
    
    # Build
    npm run build
    
    # Check build output
    if [ ! -d "build" ]; then
        print_error "Frontend build failed"
        exit 1
    fi
    
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_status "Frontend built successfully ✅ (Size: $BUILD_SIZE)"
    
    cd ..
}

# Test backend
test_backend() {
    print_step "Testing backend configuration..."
    
    cd wholetail-backend
    
    # Check if environment variables are loaded
    if [ ! -f ".env" ]; then
        print_error "Backend .env file not found. Please create it first."
        exit 1
    fi
    
    # Start server in test mode
    timeout 10s npm start > /dev/null 2>&1 || true
    
    # Test health endpoint
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend health check passed ✅"
    else
        print_warning "Backend health check failed. Please check configuration."
    fi
    
    cd ..
}

# Database setup
setup_database() {
    print_step "Setting up Supabase database..."
    
    print_status "Database schema is ready in supabase-schema.sql"
    print_warning "Please execute the schema manually in your Supabase SQL editor"
    print_warning "Don't forget to set up Row Level Security policies"
    
    # Create storage buckets instructions
    print_status "Required Supabase storage buckets:"
    echo "  - product-images (public)"
    echo "  - documents (private)"
    echo "  - receipts (private)"
}

# Security checks
security_checks() {
    print_step "Running security checks..."
    
    # Check for sensitive files
    if [ -f "wholetail-backend/.env" ]; then
        if grep -q "placeholder\|example\|your-" wholetail-backend/.env; then
            print_warning "Backend .env contains placeholder values"
        fi
    fi
    
    if [ -f "wholetail-frontend/.env" ]; then
        if grep -q "placeholder\|example\|your-" wholetail-frontend/.env; then
            print_warning "Frontend .env contains placeholder values"
        fi
    fi
    
    # Check for strong secrets
    print_status "Remember to use strong, unique secrets for:"
    echo "  - JWT_SECRET"
    echo "  - SESSION_SECRET"
    echo "  - ENCRYPTION_KEY"
    
    print_status "Security checks completed ✅"
}

# Deployment to Vercel
deploy_to_vercel() {
    print_step "Preparing for Vercel deployment..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_status "Creating vercel.json configuration..."
        cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "wholetail-frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "wholetail-backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/wholetail-backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/wholetail-frontend/build/index.html"
    }
  ]
}
EOF
    fi
    
    print_status "Ready for Vercel deployment!"
    print_warning "Run 'vercel --prod' to deploy to production"
    print_warning "Don't forget to set environment variables in Vercel dashboard"
}

# Performance optimization
optimize_performance() {
    print_step "Running performance optimizations..."
    
    # Frontend optimizations
    cd wholetail-frontend
    
    # Check bundle size
    if [ -d "build" ]; then
        BUNDLE_SIZE=$(find build/static/js -name "*.js" -exec cat {} \; | wc -c)
        BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024 / 1024))
        
        if [ $BUNDLE_SIZE_MB -gt 5 ]; then
            print_warning "Bundle size is large (${BUNDLE_SIZE_MB}MB). Consider code splitting."
        else
            print_status "Bundle size is optimal (${BUNDLE_SIZE_MB}MB) ✅"
        fi
    fi
    
    cd ..
    
    print_status "Performance optimization completed ✅"
}

# Create monitoring setup
setup_monitoring() {
    print_step "Setting up monitoring and logging..."
    
    print_status "Monitoring setup checklist:"
    echo "  □ Set up error tracking (Sentry)"
    echo "  □ Configure Google Analytics"
    echo "  □ Set up uptime monitoring"
    echo "  □ Configure log aggregation"
    echo "  □ Set up performance monitoring"
    
    print_warning "Please complete monitoring setup manually using the services above"
}

# Final checklist
final_checklist() {
    print_step "Pre-launch checklist..."
    
    echo "Manual tasks to complete:"
    echo "  □ Register wholetail.co.ke domain"
    echo "  □ Set up DNS records"
    echo "  □ Configure M-Pesa for production"
    echo "  □ Set up Google Maps API with billing"
    echo "  □ Configure Twilio SMS service"
    echo "  □ Set up SendGrid for emails"
    echo "  □ Apply for WhatsApp Business API"
    echo "  □ Execute Supabase schema"
    echo "  □ Set up RLS policies"
    echo "  □ Create storage buckets"
    echo "  □ Configure environment variables"
    echo "  □ Deploy to Vercel"
    echo "  □ Test all functionality"
    echo "  □ Set up monitoring"
    echo "  □ Create backup procedures"
    
    print_status "🎉 Deployment preparation completed!"
    print_status "Follow the manual checklist above to complete the setup"
}

# Main execution
main() {
    print_status "Starting Wholetail deployment preparation..."
    
    check_prerequisites
    setup_environment
    install_dependencies
    build_frontend
    test_backend
    setup_database
    security_checks
    deploy_to_vercel
    optimize_performance
    setup_monitoring
    final_checklist
    
    print_status "🚀 Ready for production deployment!"
    print_warning "Review all configuration files and complete the manual checklist"
}

# Script options
case "${1:-}" in
    --check)
        check_prerequisites
        ;;
    --build)
        install_dependencies
        build_frontend
        ;;
    --test)
        test_backend
        ;;
    --help)
        echo "Wholetail Deployment Script"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no option)  Run full deployment preparation"
        echo "  --check      Check prerequisites only"
        echo "  --build      Install dependencies and build"
        echo "  --test       Test backend configuration"
        echo "  --help       Show this help message"
        ;;
    *)
        main
        ;;
esac 