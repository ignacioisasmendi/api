import { registerAs } from '@nestjs/config';

export default registerAs('encryption', () => ({
  tokenKey: process.env.TOKEN_ENCRYPTION_KEY,
}));
