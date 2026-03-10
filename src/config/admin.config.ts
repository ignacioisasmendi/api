import { registerAs } from '@nestjs/config';

export default registerAs('admin', () => ({
  emails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
}));
