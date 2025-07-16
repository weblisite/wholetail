# Wholetail - B2B Agricultural Marketplace

A comprehensive digital platform connecting wholesalers, retailers, and drivers in the agricultural supply chain across Kenya.

## 🌟 Overview

Wholetail revolutionizes agricultural trade by providing a seamless B2B marketplace that enables:

- **Wholesalers** to reach a broader market and manage their inventory efficiently
- **Retailers** to access quality products at competitive prices with flexible payment options
- **Drivers** to find consistent delivery opportunities with optimized routes

## 🚀 Key Features

### For Retailers
- **Product Discovery**: Browse extensive catalog of agricultural products
- **Smart Ordering**: Bulk ordering with quantity-based pricing
- **Flexible Payments**: Cash, M-Pesa, or financing options
- **Real-time Tracking**: Track orders from confirmation to delivery
- **Quality Assurance**: Verified suppliers and quality guarantees

### For Wholesalers
- **Digital Storefront**: Professional online presence with product showcases
- **Inventory Management**: Real-time stock tracking and automated alerts
- **Payment Processing**: Secure M-Pesa integration with instant settlements
- **Analytics Dashboard**: Sales insights, customer behavior, and performance metrics
- **Advertising Platform**: Promote products with targeted campaigns

### For Drivers
- **Delivery Jobs**: Access to consistent delivery opportunities
- **Route Optimization**: AI-powered route planning for maximum efficiency
- **Earnings Tracking**: Transparent payment structure and earnings history
- **GPS Integration**: Real-time location tracking and navigation
- **Performance Metrics**: Delivery ratings and performance insights

### Core Platform Features
- **Multi-language Support**: English and Swahili
- **Mobile-first Design**: Optimized for mobile devices
- **Offline Capability**: Key features work without internet connection
- **Microfinance Integration**: Credit scoring and loan facilitation
- **Advanced Search**: AI-powered product discovery
- **Logistics Network**: Comprehensive delivery management system

## 🛠 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Google Maps API** for location services
- **PWA** capabilities for mobile experience

### Backend
- **Node.js** with Express
- **Supabase** for database and authentication
- **M-Pesa API** for payment processing
- **WhatsApp Business API** for notifications
- **Google Maps API** for logistics

### Infrastructure
- **Vercel** for frontend hosting
- **Railway/Heroku** for backend deployment
- **Supabase** for database hosting
- **CloudFlare** for CDN and security

## 📦 Project Structure

```
wholetail/
├── wholetail-frontend/          # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   └── utils/              # Utility functions
├── wholetail-backend/           # Node.js backend API
│   ├── routes/                 # API routes
│   ├── services/               # Business logic services
│   ├── middleware/             # Express middleware
│   └── utils/                  # Utility functions
├── docs/                       # Documentation
├── deploy.sh                   # Deployment script
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/wholetail.git
cd wholetail
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd wholetail-backend
npm install

# Install frontend dependencies
cd ../wholetail-frontend
npm install
```

3. **Environment Setup**
```bash
# Backend environment variables
cp wholetail-backend/.env.example wholetail-backend/.env
# Edit .env with your configuration

# Frontend environment variables
cp wholetail-frontend/.env.example wholetail-frontend/.env
# Edit .env with your configuration
```

4. **Start development servers**
```bash
# Start backend (runs on port 3001)
cd wholetail-backend
npm run dev

# Start frontend (runs on port 3000)
cd wholetail-frontend
npm start
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## 🔧 Configuration

### Required Environment Variables

#### Backend (.env)
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# M-Pesa
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_business_short_code
MPESA_PASSKEY=your_mpesa_passkey

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Communication
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
SENDGRID_API_KEY=your_sendgrid_api_key
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
```

#### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Product Endpoints
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (wholesaler only)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Order Endpoints
- `POST /api/orders` - Create new order
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

### Payment Endpoints
- `POST /api/payments/initiate` - Initiate M-Pesa payment
- `POST /api/payments/callback` - M-Pesa callback handler
- `GET /api/payments/history` - Payment history

### Location Endpoints
- `POST /api/location/geocode` - Geocode address
- `POST /api/location/distance` - Calculate distance
- `GET /api/location/routes` - Get optimized routes

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd wholetail-backend
npm test

# Frontend tests
cd wholetail-frontend
npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
```bash
# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment

1. **Automated Deployment**
```bash
chmod +x deploy.sh
./deploy.sh
```

2. **Manual Deployment**
```bash
# Build frontend
cd wholetail-frontend
npm run build

# Deploy backend to Railway/Heroku
cd wholetail-backend
git push heroku main

# Deploy frontend to Vercel
vercel --prod
```

### Environment Configuration
- See `production-config.md` for detailed production setup
- Configure environment variables in your hosting platform
- Set up domain DNS records
- Configure SSL certificates

## 📊 Monitoring & Analytics

### Performance Monitoring
- Application performance monitoring via Sentry
- Database performance via Supabase dashboard
- Server monitoring via hosting platform

### Business Analytics
- User behavior tracking via Google Analytics
- Sales metrics via custom dashboard
- Payment analytics via M-Pesa reports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Follow the existing code style
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@wholetail.co.ke or join our WhatsApp support group.

## 🙏 Acknowledgments

- **Email**: info@wholetail.co.ke
- **Website**: https://wholetail.co.ke
- **Documentation**: https://docs.wholetail.co.ke

---

Made with ❤️ in Kenya 🇰🇪 