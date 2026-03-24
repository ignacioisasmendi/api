import { registerAs } from '@nestjs/config';

export default registerAs('canva', () => ({
  clientId: process.env.CANVA_CLIENT_ID,
  clientSecret: process.env.CANVA_CLIENT_SECRET,
  callbackUrl: process.env.CANVA_CALLBACK_URL,
  authUrl: 'https://www.canva.com/api/oauth/authorize',
  tokenUrl: 'https://api.canva.com/rest/v1/oauth/token',
  profileUrl: 'https://api.canva.com/rest/v1/users/me/profile',
  scopes:
    'design:content:read design:content:write design:meta:read asset:read asset:write profile:read',
}));
