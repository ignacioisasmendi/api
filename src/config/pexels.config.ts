import { registerAs } from '@nestjs/config';

export default registerAs('pexels', () => ({
  apiKey: process.env.PEXELS_API_KEY || '',
}));
