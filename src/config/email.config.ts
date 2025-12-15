import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  // Configuración de Resend
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  
  // Remitente
  from: {
    name: process.env.EMAIL_FROM_NAME || 'QhatuPE',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@qhatupe.com',
  },
  
  // URLs del frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    resetPasswordPath: '/reset-password',
    loginPath: '/login',
    storePath: '/',
  },
  
  // Configuración de transporte SMTP (backup/alternativo)
  // Útil si quieres tener otra opción además de Resend
  transport: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  },
  
  // Feature flags
  features: {
    useResend: process.env.USE_RESEND !== 'false',
    sendWelcomeEmail: process.env.SEND_WELCOME_EMAIL === 'true',
    sendPasswordChangedEmail: process.env.SEND_PASSWORD_CHANGED_EMAIL !== 'false',
  },
}));