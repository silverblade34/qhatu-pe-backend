import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './services/token.service';
import { UserRegistrationService } from './services/user-registration.service';
import { UsernameValidationService } from './services/username-validation.service';
import { PasswordResetService } from './services/password-reset.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { GoogleRegisterDto } from './dto/google-register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailVerificationService } from './services/email-verification.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
    private userRegistrationService: UserRegistrationService,
    private usernameValidationService: UsernameValidationService,
    private passwordResetService: PasswordResetService,
    private emailVerificationService: EmailVerificationService,
    private billingService: BillingService,
  ) { }

  // ============================================
  // REGISTRO (UserRegistrationService)
  // ============================================

  async registerSeller(registerDto: RegisterSellerDto) {
    return this.userRegistrationService.registerSeller(registerDto);
  }

  async registerCustomer(registerDto: RegisterCustomerDto) {
    return this.userRegistrationService.registerCustomer(registerDto);
  }

  async registerWithGoogle(dto: GoogleRegisterDto) {
    return this.userRegistrationService.registerWithGoogle(dto);
  }

  // ============================================
  // LOGIN Y AUTENTICACIÓN
  // ============================================

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.username,
      user.role
    );

    let nextPayment = null;
    if (user.plan !== 'BASIC') {
      nextPayment = await this.billingService.getNextPaymentDue(user.id);
    }

    if (!user.isVerified) {
      await this.emailVerificationService.resendVerificationCode(user.id);
    }

    return {
      user: this.sanitizeUser(user),
      storeUrl: user.storeProfile ? `https://www.qhatupe.com/${user.username}` : null,
      nextPayment,
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { storeProfile: true },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // ============================================
  // VERIFICACIÓN DE EMAIL (EmailVerificationService)
  // ============================================
  async verifyEmailWithCode(userId: string, code: string) {
    return this.emailVerificationService.verifyEmailWithCode(userId, code);
  }

  async resendVerificationCode(userId: string) {
    return this.emailVerificationService.resendVerificationCode(userId);
  }
  // ============================================
  // TOKENS (TokenService)
  // ============================================

  async refreshToken(refreshToken: string) {
    return this.tokenService.refreshToken(refreshToken);
  }

  // ============================================
  // PERFIL Y SESIÓN
  // ============================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { storeProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.sanitizeUser(user);
  }

  async logout(userId: string) {
    return { message: 'Sesión cerrada exitosamente' };
  }

  // ============================================
  // VALIDACIÓN DE USERNAME (UsernameValidationService)
  // ============================================

  async checkUsernameAvailability(username: string) {
    return this.usernameValidationService.checkUsernameAvailability(username);
  }

  // ============================================
  // RECUPERACIÓN DE CONTRASEÑA (PasswordResetService)
  // ============================================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.requestPasswordReset(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(resetPasswordDto);
  }

  async verifyResetToken(token: string) {
    return this.passwordResetService.verifyResetToken(token);
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}