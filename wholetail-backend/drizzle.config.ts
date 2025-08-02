import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.NEON_DATABASE_URL || 'postgresql://placeholder',
  },
} satisfies Config;