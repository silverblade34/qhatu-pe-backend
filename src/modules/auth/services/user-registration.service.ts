import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { AvatarService } from '../../avatar/avatar.service';
import { MailService } from '../../mail/mail.service';
import { TokenService } from './token.service';
import { UsernameValidationService } from './username-validation.service';
import { GoogleAuthService } from './google-auth.service';
import { RegisterSellerDto } from '../dto/register-seller.dto';
import { RegisterCustomerDto } from '../dto/register-customer.dto';
import { GoogleRegisterDto } from '../dto/google-register.dto';
import { EmailVerificationService } from './email-verification.service';
import { CacheInvalidationService } from 'src/modules/redis/cache-invalidation.service';

@Injectable()
export class UserRegistrationService {
  constructor(
    private prisma: PrismaService,
    private avatarService: AvatarService,
    private mailService: MailService,
    private tokenService: TokenService,
    private cacheInvalidationService: CacheInvalidationService,
    private usernameValidationService: UsernameValidationService,
    private googleAuthService: GoogleAuthService,
    private emailVerificationService: EmailVerificationService,
  ) { }

  // REGISTRO DE VENDEDORES
  async registerSeller(registerDto: RegisterSellerDto) {
    // 1. Validar username único
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: registerDto.username.toLowerCase() },
    });
    if (existingUsername) {
      throw new ConflictException('Este username ya está en uso.');
    }

    // 2. Validar email único
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('Este email ya está registrado.');
    }

    // 3. Validar categoría
    const category = await this.prisma.category.findUnique({
      where: { id: registerDto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('La categoría seleccionada no existe.');
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 5. Obtener logo/avatar
    let logoUrl: string;
    if (registerDto.avatarUrl) {
      logoUrl = registerDto.avatarUrl;
    } else {
      logoUrl = await this.avatarService.generateAndUploadInitialsAvatar(
        registerDto.storeName
      );
    }

    // 6. Crear vendedor con tienda
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        username: registerDto.username.toLowerCase(),
        password: hashedPassword,
        fullName: registerDto.fullName,
        phone: registerDto.phone,
        plan: 'BASIC',
        role: 'SELLER',
        isVerified: false,
        avatar: logoUrl,
        storeProfile: {
          create: {
            storeName: registerDto.storeName,
            bio: `¡Bienvenido a ${registerDto.storeName}! 🛍️`,
            logo: logoUrl,
            isActive: true,
            categoryId: registerDto.categoryId,
          },
        },
      },
      include: {
        storeProfile: true,
      },
    });

    // 7. Invalidar cache
    await this.cacheInvalidationService.invalidateStoreListings();

    // 8. Generar tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.username,
      user.role
    );

    if (!user.isVerified) {
      await this.emailVerificationService.resendVerificationCode(user.id);
    }

    return {
      message: '¡Tienda creada exitosamente! Bienvenido a QhatuPe',
      user: this.sanitizeUser(user),
      storeUrl: `https://www.qhatupe.com/${user.username}`,
      ...tokens,
    };
  }

  // REGISTRO DE CLIENTES
  async registerCustomer(registerDto: RegisterCustomerDto) {
    // 1. Validar email único
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException('Este email ya está registrado.');
    }

    // 2. Generar username si no se proporciona
    let username = registerDto.username?.toLowerCase();
    if (!username) {
      username = await this.usernameValidationService.generateUniqueUsername(
        registerDto.email
      );
    } else {
      // Validar que no exista
      const existingUsername = await this.prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        throw new ConflictException('Este username ya está en uso.');
      }
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 4. Obtener avatar URL
    let avatarUrl: string;
    const fullName = registerDto.fullName || registerDto.email.split('@')[0];

    if (registerDto.avatarUrl) {
      avatarUrl = registerDto.avatarUrl;
    } else {
      avatarUrl = await this.avatarService.generateAndUploadInitialsAvatar(fullName);
    }

    // 5. Crear cliente (sin tienda)
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        username,
        password: hashedPassword,
        fullName,
        phone: '',
        plan: 'BASIC',
        avatar: avatarUrl,
        role: 'CUSTOMER',
        isVerified: false,
      },
    });

    // 6. Generar tokens
    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.username,
      user.role
    );

    // 7. Enviar email de bienvenida
    this.mailService
      .sendWelcomeEmail(user.email, user.fullName, user.username)
      .catch((error) => console.error('Error enviando bienvenida:', error));

    return {
      message: 'Cuenta creada exitosamente',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // REGISTRO RÁPIDO CON GOOGLE
  async registerWithGoogle(dto: GoogleRegisterDto) {
    // 1. Verificar token de Google
    const googleUser = await this.googleAuthService.verifyIdToken(dto.idToken);

    // 2. Buscar si el usuario ya existe
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: googleUser.email.toLowerCase() },
          { googleId: googleUser.googleId },
        ],
      },
      include: {
        storeProfile: true,
      },
    });

    // 3. Si el usuario existe → LOGIN
    if (user) {
      // Actualizar googleId si no lo tenía
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId },
          include: { storeProfile: true },
        });
      }

      const tokens = await this.tokenService.generateTokens(
        user.id,
        user.username,
        user.role
      );

      return {
        message: 'Inicio de sesión exitoso con Google',
        user: this.sanitizeUser(user),
        isNewUser: false,
        ...tokens,
      };
    }

    // 4. Si NO existe → REGISTRO AUTOMÁTICO
    const username = await this.usernameValidationService.generateUniqueUsername(
      googleUser.email
    );

    // Usar foto de Google o generar avatar
    const avatarUrl = googleUser.picture ||
      await this.avatarService.generateAndUploadInitialsAvatar(googleUser.fullName);

    // Determinar rol (por defecto CUSTOMER)
    const role = dto.role || 'CUSTOMER';

    user = await this.prisma.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        username,
        password: '',
        fullName: googleUser.fullName,
        phone: '',
        plan: 'BASIC',
        role,
        avatar: avatarUrl,
        isVerified: true,
        verificationStatus: 'APPROVED',
        googleId: googleUser.googleId,
        // Si es SELLER, crear storeProfile básico
        ...(role === 'SELLER' && {
          storeProfile: {
            create: {
              storeName: googleUser.fullName,
              bio: `¡Bienvenido a mi tienda! 🛍️`,
              logo: avatarUrl,
              isActive: false,
            },
          },
        }),
      },
      include: {
        storeProfile: true,
      },
    });

    // Invalidar cache de tiendas si es vendedor
    if (role === 'SELLER') {
      await this.cacheInvalidationService.invalidateStoreListings();
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.username,
      user.role
    );

    // Enviar email de bienvenida
    this.mailService
      .sendWelcomeEmail(user.email, user.fullName, user.username)
      .catch((error) => console.error('Error enviando bienvenida:', error));

    return {
      message: 'Registro exitoso con Google',
      user: this.sanitizeUser(user),
      isNewUser: true,
      needsProfileCompletion: role === 'SELLER',
      ...tokens,
    };
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}