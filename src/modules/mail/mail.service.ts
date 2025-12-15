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
      this.logger.warn('RESEND_API_KEY no configurada. Los emails no se enviarán.');
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend inicializado correctamente');
    }

    // Cargar configuración
    this.fromName = this.config.get<string>('email.from.name', 'QhatuPE');
    this.fromAddress = this.config.get<string>('email.from.address', 'noreply@qhatupe.com');
    this.frontendUrl = this.config.get<string>('email.frontend.url', 'http://localhost:3000');

    this.logger.log(`Email configurado: ${this.fromName} <${this.fromAddress}>`);
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string) {
    if (!this.resend) {
      this.logger.warn(`[DEV] Email de recuperación para ${email}`);
      this.logger.warn(`Token: ${resetToken}`);
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
        this.logger.error('Error enviando email de recuperación:', error);
        throw error;
      }

      this.logger.log(`Email de recuperación enviado a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('Error en sendPasswordResetEmail:', error);
      throw error;
    }
  }

  /**
   * Enviar confirmación de cambio de contraseña
   */
  async sendPasswordChangedEmail(email: string, name: string) {
    if (!this.resend) {
      this.logger.warn(`[DEV] Email de confirmación para ${email}`);
      return null;
    }

    // Verificar si está habilitado
    if (!this.config.get<boolean>('email.features.sendPasswordChangedEmail', true)) {
      this.logger.log('Email de confirmación de cambio deshabilitado');
      return null;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [email],
        subject: 'Contraseña actualizada - QhatuPE',
        html: this.getPasswordChangedTemplate(name),
      });

      if (error) {
        this.logger.error('Error enviando confirmación:', error);
        throw error;
      }

      this.logger.log(`Confirmación enviada a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('Error en sendPasswordChangedEmail:', error);
      throw error;
    }
  }

  /**
   * Enviar email de bienvenida
   */
  async sendWelcomeEmail(email: string, name: string, username: string) {
    if (!this.resend) {
      this.logger.warn(`[DEV] Email de bienvenida para ${email}`);
      return null;
    }

    // Verificar si está habilitado
    if (!this.config.get<boolean>('email.features.sendWelcomeEmail', false)) {
      this.logger.log('Email de bienvenida deshabilitado');
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
        this.logger.error('Error enviando email de bienvenida:', error);
        throw error;
      }

      this.logger.log(`Email de bienvenida enviado a: ${email} (ID: ${data?.id})`);
      return data;
    } catch (error) {
      this.logger.error('Error en sendWelcomeEmail:', error);
      throw error;
    }
  }

  // ===================================
  // TEMPLATES DE EMAIL
  // ===================================

  // Reemplaza los métodos de templates en tu mail.service.ts

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
          color: #264653; 
          background-color: #f8f9fa;
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(38, 70, 83, 0.08);
        }
        .header { 
          background: #e63946;
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .content h2 { 
          color: #264653; 
          margin: 0 0 16px 0; 
          font-size: 24px;
          font-weight: 700;
        }
        .content p { 
          margin: 12px 0; 
          color: #264653; 
          line-height: 1.6;
        }
        .button-container { 
          text-align: center; 
          margin: 32px 0; 
        }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: #e63946;
          color: white !important; 
          text-decoration: none; 
          border-radius: 10px;
          font-weight: 600;
          font-size: 16px;
          transition: background 0.2s;
        }
        .button:hover {
          background: #d62839;
        }
        .info-box { 
          background: #f8f9fa; 
          padding: 20px; 
          border-left: 3px solid #2a9d8f; 
          margin: 24px 0;
          border-radius: 6px;
        }
        .info-box p { 
          margin: 8px 0; 
          font-size: 14px;
          color: #264653;
        }
        .info-box strong { 
          color: #264653;
          font-weight: 600;
        }
        .url-box {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 6px;
          word-break: break-all;
          color: #e63946;
          font-size: 13px;
          margin: 20px 0;
          border: 1px solid #e5e7eb;
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          color: #8b8b8b; 
          font-size: 14px;
          background: #f8f9fa;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">QhatuPE</div>
        </div>
        <div class="content">
          <h2>Recuperación de Contraseña</h2>
          <p>Hola ${name},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña en QhatuPE.</p>
          <p>Haz clic en el botón para crear una nueva contraseña:</p>
          
          <div class="button-container">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>
          
          <div class="info-box">
            <p><strong>Información importante:</strong></p>
            <p>• Este enlace expira en 1 hora</p>
            <p>• Si no solicitaste este cambio, ignora este email</p>
            <p>• Nunca compartas este enlace con nadie</p>
          </div>
          
          <p style="color: #8b8b8b; font-size: 14px; margin-top: 24px;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <div class="url-box">${resetUrl}</div>
        </div>
        <div class="footer">
          <p><strong>QhatuPE</strong></p>
          <p>Marketplace Peruano</p>
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
          color: #264653; 
          background-color: #f8f9fa;
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(38, 70, 83, 0.08);
        }
        .header { 
          background: #2a9d8f;
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .content h2 { 
          color: #264653; 
          margin: 0 0 16px 0; 
          font-size: 24px;
          font-weight: 700;
        }
        .content p { 
          margin: 12px 0; 
          color: #264653; 
        }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: #2a9d8f;
          color: white !important; 
          text-decoration: none; 
          border-radius: 10px;
          font-weight: 600;
          margin: 24px 0;
        }
        .alert { 
          background: #f8f9fa; 
          padding: 20px; 
          border-left: 3px solid #e63946; 
          margin: 24px 0;
          border-radius: 6px;
        }
        .alert p { 
          margin: 8px 0; 
          font-size: 14px;
        }
        .alert strong { 
          color: #e63946;
          font-weight: 600;
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          color: #8b8b8b; 
          font-size: 14px;
          background: #f8f9fa;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">QhatuPE</div>
        </div>
        <div class="content">
          <h2>Contraseña Actualizada</h2>
          <p>Hola ${name},</p>
          <p>Tu contraseña ha sido actualizada exitosamente.</p>
          <p>Ya puedes iniciar sesión en QhatuPE con tu nueva contraseña.</p>
          
          <center>
            <a href="${loginUrl}" class="button">Iniciar Sesión</a>
          </center>
          
          <div class="alert">
            <strong>¿No fuiste tú?</strong>
            <p>Si no realizaste este cambio, contacta inmediatamente a nuestro equipo de soporte en soporte@qhatupe.com</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>QhatuPE</strong></p>
          <p>Marketplace Peruano</p>
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
          color: #264653; 
          background-color: #f8f9fa;
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(38, 70, 83, 0.08);
        }
        .header { 
          background: linear-gradient(135deg, #e63946 0%, #f4a261 100%);
          color: white; 
          padding: 40px 30px; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .content h2 { 
          color: #264653; 
          margin: 0 0 16px 0; 
          font-size: 24px;
          font-weight: 700;
        }
        .store-box {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 10px;
          text-align: center;
          margin: 24px 0;
          border: 2px solid #e5e7eb;
        }
        .store-box p {
          color: #8b8b8b;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .store-box strong { 
          color: #e63946; 
          font-size: 18px;
          word-break: break-all;
        }
        .footer { 
          text-align: center; 
          padding: 30px; 
          color: #8b8b8b; 
          font-size: 14px;
          background: #f8f9fa;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">QhatuPE</div>
          <h1 style="margin: 0; font-size: 28px;">Bienvenido a QhatuPE</h1>
        </div>
        <div class="content">
          <h2>Hola ${name}</h2>
          <p>Gracias por unirte a QhatuPE, el marketplace peruano donde puedes vender tus productos.</p>
          <div class="store-box">
            <p>Tu tienda está lista en:</p>
            <strong>${storeUrl}</strong>
          </div>
          <p>Comienza a agregar productos y comparte tu tienda con tus clientes.</p>
        </div>
        <div class="footer">
          <p><strong>QhatuPE</strong></p>
          <p>Marketplace Peruano</p>
          <p>© ${new Date().getFullYear()} QhatuPE. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }
}