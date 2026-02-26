import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0Audience: process.env.AUTH0_AUDIENCE,
  auth0Issuer:
    process.env.AUTH0_ISSUER || `https://${process.env.AUTH0_DOMAIN}/`,
}));
