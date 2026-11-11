import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/revoo_dev',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'revoo_dev_access_secret_key_very_long_and_secure_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'revoo_dev_refresh_secret_key_very_long_and_secure_2026',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'r2',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    r2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'ebb60884050ceb5a3565e132a7ef9394',
      bucketName: process.env.R2_BUCKET_NAME || 'imagix-photography-images',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '911fbef0629a384efdb68d1270c075ed',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'e9889183b2271939330898a6934ef4e2b7fab429c459dbf60d65d7724c7447ea',
      publicDomain: process.env.R2_PUBLIC_DOMAIN || '',
    },
  },
  email: {
    // Use SMTP_SERVICE=gmail (with an App Password) or an explicit SMTP_HOST/SMTP_PORT.
    smtpService: process.env.SMTP_SERVICE || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'support@genie.in',
    fromName: process.env.EMAIL_FROM_NAME || 'Genie',
  },
  google: {
    // Comma-separated extra OAuth client IDs whose Google tokens we accept (e.g. web + Android).
    allowedClientIds: (process.env.GOOGLE_ALLOWED_CLIENT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/v1/auth/customer/google/callback',
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  }
};

