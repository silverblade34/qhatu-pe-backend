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
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: UserProfileService,
    private readonly bannerService: BannerService,
    private readonly cacheInvalidation: CacheInvalidationService,
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
    const result = await this.profileService.updateProfile(user.id, updateProfileDto);

    await this.cacheInvalidation.invalidateStoreCompletely(user.username);

    return result;
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
    const result = await this.bannerService.createBanner(user.id, createBannerDto);

    await this.cacheInvalidation.invalidateStoreProfile(user.username);

    return result;
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
    const result = await this.bannerService.updateBanner(user.id, bannerId, updateBannerDto);
    await this.cacheInvalidation.invalidateStoreProfile(user.username);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('banners/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar banner' })
  async deleteBanner(@CurrentUser() user: any, @Param('id') bannerId: string) {
    const result = await this.bannerService.deleteBanner(user.id, bannerId);
    await this.cacheInvalidation.invalidateStoreProfile(user.username);
    return result;
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