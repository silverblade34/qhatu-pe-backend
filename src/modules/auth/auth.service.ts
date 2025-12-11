import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AvatarService } from '../avatar/avatar.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { QuickRegisterDto } from './dto/quick-register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private avatarService: AvatarService,
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
          },
        },
      },
      include: {
        storeProfile: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    return {
      message: '¡Tienda creada exitosamente! Bienvenido a Qhatu.pe',
      user: this.sanitizeUser(user),
      storeUrl: `https://qhatu.pe/${user.username}`,
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
        role: 'SELLER', // Los clientes también son SELLER pero sin tienda activa
        isVerified: false,
      },
    });

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    return {
      message: 'Cuenta creada exitosamente',
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // REGISTRO RÁPIDO CON GOOGLE
  async quickRegisterWithGoogle(quickRegisterDto: QuickRegisterDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: quickRegisterDto.email.toLowerCase() },
    });

    if (user) {
      const tokens = await this.generateTokens(user.id, user.username, user.role);
      return {
        message: 'Inicio de sesión exitoso',
        user: this.sanitizeUser(user),
        ...tokens,
      };
    }

    const username = await this.generateUniqueUsername(quickRegisterDto.email);

    let avatarUrl: string;
    if (quickRegisterDto.picture) {
      avatarUrl = quickRegisterDto.picture;
    } else {
      const randomAvatar = this.avatarService.getRandomAvatar();
      avatarUrl = randomAvatar?.url || await this.avatarService.generateAndUploadInitialsAvatar(quickRegisterDto.fullName);
    }

    user = await this.prisma.user.create({
      data: {
        email: quickRegisterDto.email.toLowerCase(),
        username,
        password: '',
        fullName: quickRegisterDto.fullName,
        phone: '',
        plan: 'BASIC',
        role: 'SELLER',
        avatar: avatarUrl,
        isVerified: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.username, user.role);

    return {
      message: 'Registro exitoso con Google',
      user: this.sanitizeUser(user),
      avatarUrl,
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
}