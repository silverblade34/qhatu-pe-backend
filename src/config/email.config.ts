import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  from: {
    name: process.env.EMAIL_FROM_NAME || 'QhatuPE',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@qhatu.pe',
  },
  transport: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  },
}));