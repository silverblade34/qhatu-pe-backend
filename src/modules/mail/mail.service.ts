import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly fromName: string;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    // Inicializar Resend con la API key
    const apiKey = this.config.get<string>('email.resend.apiKey');
    
    if (!apiKey) {
      this.logger.warn('⚠️ RESEND_API_KEY no configurada. Los emails no se enviarán.');
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend inicializado correctamente');
    }

    // Cargar configuración
    this.fromName = this.config.get<string>('email.from.name', 'QhatuPE');
    this.fromAddress = this.config.get<string>('email.from.address', 'noreply@qhatupe.com');
    this.frontendUrl = this.config.get<string>('email.frontend.url', 'http://localhost:3000');

    this.logger.log(`📧 Email configurado: ${this.fromName} <${this.fromAddress}>`);
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string) {
    if (!this.resend) {
      this.logger.warn(`📧 [DEV] Email de recuperación para ${email}`);
      this.logger.warn(`🔗 Token: ${resetToken}`);
      return null;
    }

    const resetUrl = `${this.frontendUrl}${this.config.get('email.frontend.resetPasswordPath', '/reset-password')}?token=${resetToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [email],
        subject: '🔐 Recupera tu contraseña - QhatuPE',
        html: this.getPasswordResetTemplate(name, resetUrl),
      });

      if (error) {
        this.logger.error('❌ Error enviando email de recuperación:', error);
        throw error;
      }

      this.logger.log(`✅ Email de recuperación enviado a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('❌ Error en sendPasswordResetEmail:', error);
      throw error;
    }
  }

  /**
   * Enviar confirmación de cambio de contraseña
   */
  async sendPasswordChangedEmail(email: string, name: string) {
    if (!this.resend) {
      this.logger.warn(`📧 [DEV] Email de confirmación para ${email}`);
      return null;
    }

    // Verificar si está habilitado
    if (!this.config.get<boolean>('email.features.sendPasswordChangedEmail', true)) {
      this.logger.log('⏭️ Email de confirmación de cambio deshabilitado');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [email],
        subject: '✅ Contraseña actualizada - QhatuPE',
        html: this.getPasswordChangedTemplate(name),
      });

      if (error) {
        this.logger.error('❌ Error enviando confirmación:', error);
        throw error;
      }

      this.logger.log(`✅ Confirmación enviada a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('❌ Error en sendPasswordChangedEmail:', error);
      throw error;
    }
  }

  /**
   * Enviar email de bienvenida
   */
  async sendWelcomeEmail(email: string, name: string, username: string) {
    if (!this.resend) {
      this.logger.warn(`📧 [DEV] Email de bienvenida para ${email}`);
      return null;
    }

    // Verificar si está habilitado
    if (!this.config.get<boolean>('email.features.sendWelcomeEmail', false)) {
      this.logger.log('⏭️ Email de bienvenida deshabilitado');
      return null;
    }

    const storeUrl = `${this.frontendUrl}/${username}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [email],
        subject: '🎉 ¡Bienvenido a QhatuPE!',
        html: this.getWelcomeTemplate(name, username, storeUrl),
      });

      if (error) {
        this.logger.error('❌ Error enviando email de bienvenida:', error);
        throw error;
      }

      this.logger.log(`✅ Email de bienvenida enviado a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('❌ Error en sendWelcomeEmail:', error);
      throw error;
    }
  }

  // ===================================
  // TEMPLATES DE EMAIL
  // ===================================

  private getPasswordResetTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f9fafb;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .logo { font-size: 48px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .content h2 { color: #111827; margin: 0 0 15px 0; font-size: 24px; }
          .content p { margin: 12px 0; color: #4b5563; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }
          .warning { 
            background: #fef3c7; 
            padding: 20px; 
            border-left: 4px solid #f59e0b; 
            margin: 25px 0;
            border-radius: 4px;
          }
          .warning strong { color: #92400e; display: block; margin-bottom: 8px; }
          .warning ul { margin: 10px 0; padding-left: 20px; }
          .warning li { margin: 5px 0; color: #78350f; }
          .url-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            word-break: break-all;
            color: #6366f1;
            font-size: 13px;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #6b7280; 
            font-size: 14px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛍️</div>
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <h2>Hola, ${name}! 👋</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña en <strong>QhatuPE</strong>.</p>
            <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button">Restablecer mi Contraseña</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Información importante</strong>
              <ul>
                <li>Este enlace <strong>expira en 1 hora</strong></li>
                <li>Si no solicitaste este cambio, ignora este email</li>
                <li>Nunca compartas este enlace con nadie</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Si el botón no funciona, copia y pega este enlace:</p>
            <div class="url-box">${resetUrl}</div>
          </div>
          <div class="footer">
            <p><strong>QhatuPE</strong> - Marketplace Peruano 🇵🇪</p>
            <p>© ${new Date().getFullYear()} QhatuPE. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordChangedTemplate(name: string): string {
    const loginUrl = `${this.frontendUrl}${this.config.get('email.frontend.loginPath', '/login')}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f9fafb;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .success-icon { font-size: 64px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .content { padding: 40px 30px; }
          .content p { margin: 12px 0; color: #4b5563; }
          .alert { 
            background: #fee2e2; 
            padding: 20px; 
            border-left: 4px solid #ef4444; 
            margin: 25px 0;
            border-radius: 4px;
          }
          .alert strong { color: #991b1b; display: block; margin-bottom: 8px; }
          .button { 
            display: inline-block; 
            padding: 12px 28px; 
            background: #10b981;
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #6b7280; 
            font-size: 14px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1>Contraseña Actualizada</h1>
          </div>
          <div class="content">
            <h2>Hola, ${name}! 👋</h2>
            <p>Tu contraseña ha sido <strong>actualizada exitosamente</strong>.</p>
            <p>Ya puedes iniciar sesión en QhatuPE con tu nueva contraseña.</p>
            
            <center>
              <a href="${loginUrl}" class="button">Iniciar Sesión</a>
            </center>
            
            <div class="alert">
              <strong>⚠️ ¿No fuiste tú?</strong>
              <p>Si no realizaste este cambio, contacta inmediatamente a:</p>
              <p><strong>soporte@qhatupe.com</strong></p>
            </div>
          </div>
          <div class="footer">
            <p><strong>QhatuPE</strong> - Marketplace Peruano 🇵🇪</p>
            <p>© ${new Date().getFullYear()} QhatuPE. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeTemplate(name: string, username: string, storeUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f9fafb;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .content { padding: 40px 30px; }
          .store-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .store-box strong { color: #6366f1; font-size: 18px; }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #6b7280; 
            font-size: 14px;
            background: #f9fafb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a QhatuPE!</h1>
          </div>
          <div class="content">
            <h2>Hola, ${name}! 👋</h2>
            <p>Gracias por unirte a <strong>QhatuPE</strong>, el marketplace peruano.</p>
            <div class="store-box">
              <p>Tu tienda está lista en:</p>
              <strong>${storeUrl}</strong>
            </div>
          </div>
          <div class="footer">
            <p><strong>QhatuPE</strong> - Marketplace Peruano 🇵🇪</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}