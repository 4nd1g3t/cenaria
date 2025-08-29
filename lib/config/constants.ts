// lib/config/constants.ts
import { z } from 'zod';

function getDefaults() {
  return {
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: 'https://api.cenaria.app',
    DDB_TABLE: 'dev-table',
    DDB_GSI1_NAME: 'GSI1'
  };
}

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  DDB_TABLE: z.string().min(1),
  DDB_GSI1_NAME: z.string().default('GSI1'),
});

// Validate environment variables at startup
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success && process.env.NODE_ENV === 'production') {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Environment validation failed');
  }
  return result.success ? result.data : getDefaults();
}

const env = validateEnv();

// Application constants
export const MAX_PANTRY_ITEMS = 50;
export const MAX_RECIPE_STEPS = 20;
export const MAX_RECIPE_INGREDIENTS = 30;

// Environment-based URLs
export const APP_URL = env.NEXT_PUBLIC_APP_URL;
export const API_URL = env.NEXT_PUBLIC_API_URL;
export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = env.NODE_ENV === 'development';

// Database configuration
export const TABLE = env.DDB_TABLE;
export const GSI1 = env.DDB_GSI1_NAME;

// Security settings
export const COOKIE_SETTINGS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

// Validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// API timeouts
export const TIMEOUTS = {
  DEFAULT_REQUEST: 10000, // 10s
  UPLOAD_REQUEST: 30000,  // 30s
  DB_QUERY: 5000,         // 5s
} as const;