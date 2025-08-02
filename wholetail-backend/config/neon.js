const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

// Neon configuration with safe defaults
const neonConnectionString = process.env.NEON_DATABASE_URL || 'postgresql://placeholder';

let db = null;

try {
  // Check if we have real Neon credentials (not placeholders)
  if (neonConnectionString.includes('placeholder')) {
    console.warn('⚠️  Neon database credentials not configured. Using mock client for development.');
    console.warn('   Please set NEON_DATABASE_URL environment variable.');
    
    // Create mock database client for development
    const mockResponse = () => Promise.resolve([]);
    const mockQuery = {
      execute: mockResponse,
      all: mockResponse,
      get: mockResponse,
      run: mockResponse
    };
    
    db = {
      select: () => ({ from: () => ({ where: () => mockQuery, execute: mockResponse }) }),
      insert: () => ({ into: () => ({ values: () => mockQuery }) }),
      update: () => ({ set: () => ({ where: () => mockQuery }) }),
      delete: () => ({ from: () => ({ where: () => mockQuery }) }),
      execute: mockResponse
    };
  } else {
    // Create real Neon database connection
    const sql = neon(neonConnectionString);
    db = drizzle(sql);
    console.log('✅ Neon database initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Neon database:', error.message);
  process.exit(1);
}

module.exports = {
  db,
  sql: neonConnectionString.includes('placeholder') ? null : neon(neonConnectionString)
};