import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { QuickRegisterDto } from './dto/quick-register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GoogleRegisterDto } from './dto/google-register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ============================================
  // REGISTRO
  // ============================================

  @Public()
  @Post('register/seller')
  @ApiOperation({ summary: 'Registrar nuevo vendedor (tienda completa)' })
  async registerSeller(@Body() registerDto: RegisterSellerDto) {
    return this.authService.registerSeller(registerDto);
  }

  @Public()
  @Post('register/customer')
  @ApiOperation({ summary: 'Registrar cliente (comprador simplificado)' })
  async registerCustomer(@Body() registerDto: RegisterCustomerDto) {
    return this.authService.registerCustomer(registerDto);
  }

  @Public()
  @Post('register/google')
  @ApiOperation({
    summary: 'Registro o login con Google OAuth',
    description: 'Verifica el token de Google y crea/autentica al usuario'
  })
  async registerWithGoogle(@Body() dto: GoogleRegisterDto) {
    return this.authService.registerWithGoogle(dto);
  }

  // ============================================
  // AUTENTICACIÓN
  // ============================================

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  // ============================================
  // TOKENS
  // ============================================

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  // ============================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ============================================

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Get('verify-reset-token/:token')
  @ApiOperation({ summary: 'Verificar validez de token de recuperación' })
  async verifyResetToken(@Param('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  // ============================================
  // PERFIL Y VALIDACIONES
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Public()
  @Get('check-username')
  @ApiOperation({ summary: 'Verificar disponibilidad de username' })
  async checkUsername(@Query('username') username: string) {
    return this.authService.checkUsernameAvailability(username);
  }
}