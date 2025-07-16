const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with safe defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_anon_key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key';

// Create Supabase clients only if valid configuration is provided
let supabase = null;
let supabaseAdmin = null;

try {
  // Check if we have real Supabase credentials (not placeholders)
  if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
    console.warn('⚠️  Supabase credentials not configured. Using mock clients for development.');
    console.warn('   Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    
    // Create mock clients for development
    const mockResponse = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
    
    supabase = {
      auth: {
        signUp: mockResponse,
        signInWithPassword: mockResponse,
        signOut: mockResponse,
        getUser: mockResponse,
        resetPasswordForEmail: mockResponse
      },
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: mockResponse,
            order: () => ({ single: mockResponse })
          }),
          order: () => ({ single: mockResponse })
        }),
        insert: () => ({ 
          select: () => ({ single: mockResponse })
        }),
        update: () => ({ 
          eq: () => ({ 
            select: () => ({ single: mockResponse })
          })
        }),
        delete: () => ({ eq: mockResponse }),
        upsert: () => ({ 
          select: () => ({ single: mockResponse })
        })
      })
    };
    
    supabaseAdmin = {
      ...supabase,
      auth: {
        ...supabase.auth,
        admin: {
          deleteUser: mockResponse
        }
      }
    };
  } else {
    // Create real Supabase clients
    supabase = createClient(supabaseUrl, supabaseKey);
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('✅ Supabase clients initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Supabase clients:', error.message);
  process.exit(1);
}

module.exports = {
  supabase,
  supabaseAdmin
}; 