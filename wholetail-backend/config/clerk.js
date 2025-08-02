const { clerkClient } = require('@clerk/express');

// Clerk configuration with safe defaults
const clerkSecretKey = process.env.CLERK_SECRET_KEY || 'placeholder_secret_key';

let clerk = null;

try {
  // Check if we have real Clerk credentials (not placeholders)
  if (clerkSecretKey.includes('placeholder')) {
    console.warn('⚠️  Clerk credentials not configured. Using mock client for development.');
    console.warn('   Please set CLERK_SECRET_KEY environment variable.');
    
    // Create mock Clerk client for development
    const mockResponse = () => Promise.resolve({ data: null, error: { message: 'Clerk not configured' } });
    
    clerk = {
      users: {
        getUser: mockResponse,
        getUserList: mockResponse,
        createUser: mockResponse,
        updateUser: mockResponse,
        deleteUser: mockResponse
      },
      sessions: {
        verifySession: mockResponse,
        revokeSession: mockResponse
      }
    };
  } else {
    // Create real Clerk client
    clerk = clerkClient;
    console.log('✅ Clerk client initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Clerk client:', error.message);
  process.exit(1);
}

module.exports = {
  clerk
};