import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class EmailVerificationService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
    ) { }

    /**
     * Genera un código de verificación de 4 dígitos
     */
    private generateVerificationCode(): string {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    /**
     * Envía el email de verificación con código de 4 dígitos
     */
    async sendVerificationEmail(userId: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, fullName: true, isVerified: true },
        });

        if (!user) {
            throw new BadRequestException('Usuario no encontrado');
        }

        if (user.isVerified) {
            throw new BadRequestException('El email ya está verificado');
        }

        // Generar código de 4 dígitos
        const verificationCode = this.generateVerificationCode();
        const expiryMinutes = 5; // Código válido por 5 minutos
        const verificationCodeExpiry = new Date();
        verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + expiryMinutes);

        // Guardar código en la base de datos
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode,
                verificationCodeExpiry,
            },
        });

        // Enviar email
        await this.mailService.sendVerificationEmail(
            user.email,
            user.fullName,
            verificationCode
        );
    }

    /**
     * Verifica el código ingresado por el usuario
     */
    async verifyEmailWithCode(userId: string, code: string): Promise<{ message: string; verified: boolean }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                isVerified: true,
                verificationCode: true,
                verificationCodeExpiry: true,
                fullName: true,
                username: true,
            },
        });

        if (!user) {
            throw new BadRequestException('Usuario no encontrado');
        }

        if (user.isVerified) {
            return {
                message: 'El email ya ha sido verificado anteriormente',
                verified: true,
            };
        }

        const now = new Date().getTime();
        const expiryTime = new Date(user.verificationCodeExpiry).getTime();

        if (!user.verificationCode || !user.verificationCodeExpiry) {
            throw new BadRequestException('No hay código de verificación pendiente. Solicita uno nuevo.');
        }

        if (now > expiryTime) {
            throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
        }

        // Verificar si el código coincide
        if (user.verificationCode !== code) {
            throw new BadRequestException('Código incorrecto. Verifica e intenta nuevamente.');
        }

        // Marcar como verificado y limpiar el código
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationStatus: 'APPROVED',
                verificationCode: null,
                verificationCodeExpiry: null,
            },
        });

        // 9. Enviar email de bienvenida
        await this.mailService
            .sendWelcomeEmail(user.email, user.fullName, user.username);
            
        return {
            message: '¡Email verificado exitosamente! Ya puedes usar todas las funciones de QhatuPE',
            verified: true,
        };
    }

    /**
     * Reenvía el código de verificación
     */
    async resendVerificationCode(userId: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, isVerified: true },
        });

        if (!user) {
            throw new BadRequestException('Usuario no encontrado');
        }

        if (user.isVerified) {
            throw new BadRequestException('Este email ya está verificado');
        }

        await this.sendVerificationEmail(user.id);

        return {
            message: 'Código de verificación reenviado. Revisa tu bandeja de entrada'
        };
    }

    /**
     * Verifica si un usuario está verificado antes de realizar acciones
     */
    async requireVerification(userId: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isVerified: true, email: true },
        });

        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        if (!user.isVerified) {
            throw new UnauthorizedException(
                'Debes verificar tu email antes de realizar esta acción. Revisa tu bandeja de entrada.'
            );
        }
    }
}