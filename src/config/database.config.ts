import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,

  // Connection pool settings (optional)
  poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),

  // Query settings
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
  logQueries: process.env.DB_LOG_QUERIES === 'true',
}));
