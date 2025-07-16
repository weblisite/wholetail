const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Load routes one by one to identify the problematic one
console.log('Loading auth routes...');
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

console.log('Loading users routes...');
try {
  app.use('/api/users', require('./routes/users'));
  console.log('✅ Users routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading users routes:', error.message);
}

console.log('Loading products routes...');
try {
  app.use('/api/products', require('./routes/products'));
  console.log('✅ Products routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading products routes:', error.message);
}

console.log('Loading orders routes...');
try {
  app.use('/api/orders', require('./routes/orders'));
  console.log('✅ Orders routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading orders routes:', error.message);
}

console.log('Loading payments routes...');
try {
  app.use('/api/payments', require('./routes/payments'));
  console.log('✅ Payments routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading payments routes:', error.message);
}

console.log('Loading financing routes...');
try {
  app.use('/api/financing', require('./routes/financing'));
  console.log('✅ Financing routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading financing routes:', error.message);
}

console.log('Loading logistics routes...');
try {
  app.use('/api/logistics', require('./routes/logistics'));
  console.log('✅ Logistics routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading logistics routes:', error.message);
}

console.log('Loading mapping routes...');
try {
  app.use('/api/mapping', require('./routes/mapping'));
  console.log('✅ Mapping routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading mapping routes:', error.message);
}

console.log('Loading notifications routes...');
try {
  app.use('/api/notifications', require('./routes/notifications'));
  console.log('✅ Notifications routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading notifications routes:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wholetail API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - Fixed to avoid path-to-regexp error
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Wholetail Debug Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 