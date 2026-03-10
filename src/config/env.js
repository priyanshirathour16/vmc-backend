import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Configuration
 * Validates and exports all environment variables used across the app
 */

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVER_PORT: parseInt(process.env.SERVER_PORT || '5000', 10),
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  
  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@vmcreviews.com',
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  
  // CAPTCHA
  CAPTCHA_SECRET: process.env.CAPTCHA_SECRET,
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  
  // Feature Flags
  ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION !== 'false',
  ENABLE_FRAUD_DETECTION: process.env.ENABLE_FRAUD_DETECTION !== 'false',
};

// Validate critical environment variables
const validateEnvironment = () => {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    if (config.NODE_ENV === 'production') {
      throw new Error('Missing critical environment variables');
    }
  }
};

validateEnvironment();

export default config;
