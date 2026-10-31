const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  appName: process.env.APP_NAME || 'GBS Enterprise Backend',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || 'GBS_SECRET_DEFAULT_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'GBS_REFRESH_SECRET_2026',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '1h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10)
  }
};
