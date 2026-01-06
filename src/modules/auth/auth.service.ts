import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { AvatarService } from '../avatar/avatar.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { QuickRegisterDto } from './dto/quick-register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetService } from './services/password-reset.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleRegisterDto } from './dto/google-register.dto';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private avatarService: AvatarService,
    private mailService: MailService,
    private googleAuthService: GoogleAuthService,
    private passwordResetService: PasswordResetService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
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

    let logoUrl: string;

    if (registerDto.avatarUrl) {
      // Usuario seleccionó un avatar del catálogo
      logoUrl = registerDto.avatarUrl;
    } else {
      // Generar avatar con iniciales y subirlo a MinIO
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

    await this.invalidateStoresCache(user.username, registerDto.categoryId);

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    this.mailService
      .sendWelcomeEmail(user.email, user.fullName, user.username)
      .catch((error) => console.error('Error enviando bienvenida:', error));

    return {
      message: '¡Tienda creada exitosamente! Bienvenido a Qhatu.pe',
      user: this.sanitizeUser(user),
      storeUrl: `https://qhatu.pe/${user.username}`,
      ...tokens,
    };
  }

  /**
  * Invalida todo el cache relacionado con tiendas
  */
  private async invalidateStoresCache(username: string, categoryId?: string): Promise<void> {
    try {
      const patterns = [
        'stores_search:*',        // Búsquedas de tiendas
        'stores_featured:*',      // Tiendas destacadas
        `store_profile:${username}:*`, // Perfil de esta tienda
      ];

      // Si hay categoría, invalida también el cache de esa categoría
      if (categoryId) {
        patterns.push(`stores_by_category:${categoryId}:*`);
      }

      const stores: any = this.cacheManager.stores;
      if (!stores || stores.length === 0) return;

      const store = stores[0];
      const client = store.client || store.getClient?.();

      if (!client) {
        console.warn('No se pudo obtener cliente Redis para invalidación');
        return;
      }

      for (const pattern of patterns) {
        let cursor = '0';
        let keysDeleted = 0;

        do {
          const result = await client.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });

          cursor = result.cursor;

          if (result.keys.length > 0) {
            await Promise.all(result.keys.map((key: string) => this.cacheManager.del(key)));
            keysDeleted += result.keys.length;
          }
        } while (cursor !== '0');

        if (keysDeleted > 0) {
          console.log(`Cache invalidado: ${keysDeleted} keys de ${pattern}`);
        }
      }
    } catch (error) {
      console.error('Error invalidando cache de tiendas:', error);
    }
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
      username = await this.generateUniqueUsername(registerDto.email);
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
      // Generar avatar con iniciales y subirlo a MinIO
      avatarUrl = await this.avatarService.generateAndUploadInitialsAvatar(fullName);
    }

    // 5. Crear cliente (sin tienda)
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        username,
        password: hashedPassword,
        fullName,
        phone: '', // Opcional para clientes
        plan: 'BASIC',
        avatar: avatarUrl,
        role: 'CUSTOMER', // Los clientes son CUSTOMER y sin tienda activa
        isVerified: false,
      },
    });

    const tokens = await this.generateTokens(user.id, user.username, user.role);

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
  /**
    * Registro o Login con Google OAuth
    * - Si el usuario existe → Login
    * - Si no existe → Registro automático
    */
  async registerWithGoogle(dto: GoogleRegisterDto) {
    // 1. VERIFICAR TOKEN DE GOOGLE (esto previene ataques)
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

      const tokens = await this.generateTokens(user.id, user.username, user.role);

      return {
        message: 'Inicio de sesión exitoso con Google',
        user: this.sanitizeUser(user),
        isNewUser: false,
        ...tokens,
      };
    }

    // 4. Si NO existe → REGISTRO AUTOMÁTICO
    const username = await this.generateUniqueUsername(googleUser.email);

    // Usar foto de Google o generar avatar
    const avatarUrl = googleUser.picture ||
      await this.avatarService.generateAndUploadInitialsAvatar(googleUser.fullName);

    // Determinar rol (por defecto CUSTOMER, pero puede ser SELLER)
    const role = dto.role || 'CUSTOMER';

    user = await this.prisma.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        username,
        password: '', // Sin password porque usa Google
        fullName: googleUser.fullName,
        phone: '',
        plan: 'BASIC',
        role,
        avatar: avatarUrl,
        // ✅ SI viene de Google OAuth, el email YA está verificado
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
              isActive: false, // Inactiva hasta que complete el perfil
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
      await this.invalidateStoresCache(user.username);
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // Enviar email de bienvenida
    this.mailService
      .sendWelcomeEmail(user.email, user.fullName, user.username)
      .catch((error) => console.error('Error enviando bienvenida:', error));

    return {
      message: 'Registro exitoso con Google',
      user: this.sanitizeUser(user),
      isNewUser: true,
      needsProfileCompletion: role === 'SELLER', // Frontend puede redirigir a completar perfil
      ...tokens,
    };
  }

  // LOGIN
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    return {
      user: this.sanitizeUser(user),
      storeUrl: user.storeProfile ? `https://qhatu.pe/${user.username}` : null,
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

  // UTILIDADES
  private async generateUniqueUsername(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  async checkUsernameAvailability(username: string) {
    if (!username || username.length < 3) {
      return {
        available: false,
        message: 'El username debe tener al menos 3 caracteres',
      };
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return {
        available: false,
        message: 'Username solo puede contener letras minúsculas, números y guiones bajos',
      };
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUser) {
      const suggestions = await this.generateUsernameSuggestions(username);
      return {
        available: false,
        message: 'Este username ya está en uso',
        suggestions,
      };
    }

    return {
      available: true,
      message: '¡Username disponible!',
      url: `https://qhatu.pe/${username.toLowerCase()}`,
    };
  }

  private async generateUsernameSuggestions(username: string): Promise<string[]> {
    const suggestions: string[] = [];
    const baseUsername = username.toLowerCase();

    for (let i = 1; i <= 3; i++) {
      const suggestion = `${baseUsername}${Math.floor(Math.random() * 999)}`;
      const exists = await this.prisma.user.findUnique({ where: { username: suggestion } });
      if (!exists) suggestions.push(suggestion);
    }

    const suffixes = ['pe', 'shop', 'store', 'oficial'];
    for (const suffix of suffixes) {
      const suggestion = `${baseUsername}_${suffix}`;
      const exists = await this.prisma.user.findUnique({ where: { username: suggestion } });
      if (!exists && suggestions.length < 5) suggestions.push(suggestion);
    }

    return suggestions.slice(0, 5);
  }

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get('jwt.accessTokenExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.config.get('jwt.refreshTokenExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      return this.generateTokens(user.id, user.username, user.role);
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordResetService.requestPasswordReset(forgotPasswordDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(resetPasswordDto);
  }

  async verifyResetToken(token: string) {
    return this.passwordResetService.verifyResetToken(token);
  }
}