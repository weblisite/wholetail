const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Wholetail Test API is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  try {
    const { supabase } = require('./config/database');
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      supabase_configured: !!supabase
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🧪 Test Server running on port ${PORT}`);
}); 