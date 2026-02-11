import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || 'log',
  logLevels: process.env.LOG_LEVELS?.split(',') || ['log', 'error', 'warn', 'debug', 'verbose'],
  
  // Application settings
  apiPrefix: process.env.API_PREFIX || '',
  corsEnabled: process.env.CORS_ENABLED === 'true' || true,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
}));
