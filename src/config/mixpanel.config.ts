import { registerAs } from '@nestjs/config';

export default registerAs('mixpanel', () => ({
  token: process.env.MIXPANEL_TOKEN,
  enabled: process.env.MIXPANEL_ENABLED === 'true',
}));
