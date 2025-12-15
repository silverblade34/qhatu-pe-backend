import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/database/prisma.service';
import { MailService } from 'src/modules/mail/mail.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Por seguridad, siempre devolvemos el mismo mensaje
    if (!user) {
      return {
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación en breve',
      };
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Expiración en 1 hora
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    // Guardar token en BD
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: resetTokenExpiry,
      },
    });

    // Enviar email usando MailService
    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.fullName || user.username,
        resetToken,
      );
    } catch (error) {
      console.error('Error enviando email:', error);
    }

    return {
      success: true,
      message: 'Si el email existe, recibirás un enlace de recuperación en breve',
    };
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.findUserByResetToken(token);

    if (!user) {
      throw new BadRequestException(
        'Token inválido o expirado. Solicita un nuevo enlace de recuperación.'
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar tokens
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Enviar email de confirmación
    this.mailService
      .sendPasswordChangedEmail(user.email, user.fullName || user.username)
      .catch((error) => console.error('Error enviando confirmación:', error));

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.',
    };
  }

  /**
   * Verificar validez de un token de recuperación
   */
  async verifyResetToken(token: string) {
    const user = await this.findUserByResetToken(token);

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    return {
      valid: true,
      email: this.maskEmail(user.email),
      message: 'Token válido',
    };
  }

  /**
   * Buscar usuario por token de reset válido
   */
  private async findUserByResetToken(token: string) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: {
          gte: new Date(),
        },
      },
    });
  }

  /**
   * Enmascarar email para mostrar parcialmente
   */
  private maskEmail(email: string): string {
    return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  }
}