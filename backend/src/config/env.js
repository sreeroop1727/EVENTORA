import 'dotenv/config'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  cookieName: process.env.COOKIE_NAME || 'eventora_session',
  uploadDir: process.env.UPLOAD_DIR || './private-uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 8,
  isProduction: process.env.NODE_ENV === 'production',
}