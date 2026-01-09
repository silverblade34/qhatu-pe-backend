import { Controller, Get, Put, Body, UseGuards, Post, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerService } from './services/banner.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: UserProfileService,
    private readonly bannerService: BannerService,
  ) { }

  // ENDPOINT PROTEGIDO - Ver mi perfil completo
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getUserWithProfile(user.id);
  }

  // ENDPOINT PROTEGIDO - Actualizar mi perfil
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    console.log("===============================")
    console.log(JSON.stringify(updateProfileDto, null, 2));
    console.log("===============================")

    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  // ========== BANNERS ==========

  @UseGuards(JwtAuthGuard)
  @Post('banners')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear banner' })
  async createBanner(
    @CurrentUser() user: any,
    @Body() createBannerDto: CreateBannerDto,
  ) {
    return this.bannerService.createBanner(user.id, createBannerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('banners')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener banners' })
  async getBanners(@CurrentUser() user: any) {
    return this.bannerService.getBanners(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('banners/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar banner' })
  async updateBanner(
    @CurrentUser() user: any,
    @Param('id') bannerId: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannerService.updateBanner(user.id, bannerId, updateBannerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('banners/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar banner' })
  async deleteBanner(@CurrentUser() user: any, @Param('id') bannerId: string) {
    return this.bannerService.deleteBanner(user.id, bannerId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('banners/reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reordenar banners' })
  async reorderBanners(
    @CurrentUser() user: any,
    @Body('bannerIds') bannerIds: string[],
  ) {
    return this.bannerService.reorderBanners(user.id, bannerIds);
  }
}