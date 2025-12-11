import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { QuickRegisterDto } from './dto/quick-register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // REGISTRO DE VENDEDORES
  @Public()
  @Post('register/seller')
  @ApiOperation({ summary: 'Registrar nuevo vendedor (tienda completa)' })
  async registerSeller(@Body() registerDto: RegisterSellerDto) {
    return this.authService.registerSeller(registerDto);
  }

  // REGISTRO DE CLIENTES
  @Public()
  @Post('register/customer')
  @ApiOperation({ summary: 'Registrar cliente (comprador simplificado)' })
  async registerCustomer(@Body() registerDto: RegisterCustomerDto) {
    return this.authService.registerCustomer(registerDto);
  }

  // REGISTRO RÁPIDO CON GOOGLE
  @Public()
  @Post('register/google')
  @ApiOperation({ summary: 'Registro/Login rápido con Google' })
  async quickRegister(@Body() quickRegisterDto: QuickRegisterDto) {
    return this.authService.quickRegisterWithGoogle(quickRegisterDto);
  }

  // LOGIN
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // VALIDAR USERNAME
  @Public()
  @Get('check-username')
  @ApiOperation({ summary: 'Verificar disponibilidad de username' })
  async checkUsername(@Query('username') username: string) {
    return this.authService.checkUsernameAvailability(username);
  }

  // REFRESCAR TOKEN
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar access token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  // OBTENER PERFIL
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario autenticado' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  // LOGOUT
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }
}