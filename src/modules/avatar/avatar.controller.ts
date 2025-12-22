import { Controller, Get, Query, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AvatarService, AvatarStyle } from './avatar.service';

@ApiTags('Avatars')
@Controller('avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todos los avatares del catálogo' })
  @ApiQuery({ name: 'limit', required: false })
  async getAllAvatars(@Query('limit') limit?: number) {
    return this.avatarService.getAllAvatars(limit ? +limit : undefined);
  }

  @Public()
  @Get('selection')
  @ApiOperation({ summary: 'Obtener avatares aleatorios para selección' })
  @ApiQuery({ name: 'count', required: false })
  @ApiQuery({ name: 'style', required: false })
  getAvatarsForSelection(
    @Query('count') count?: number,
    @Query('style') style?: AvatarStyle,
  ) {
    return this.avatarService.getRandomAvatarsForSelection(
      count ? +count : 12,
      style,
    );
  }

  @Public()
  @Get('random')
  @ApiOperation({ summary: 'Obtener un avatar aleatorio' })
  @ApiQuery({ name: 'style', required: false })
  getRandomAvatar(@Query('style') style?: AvatarStyle) {
    const avatar = style
      ? this.avatarService.getRandomAvatarByStyle(style)
      : this.avatarService.getRandomAvatar();
    if (!avatar) return { success: false, message: 'No disponible' };
    return avatar;
  }

  @Public()
  @Get('by-id/:id')
  @ApiOperation({ summary: 'Obtener avatar por ID' })
  getAvatarById(@Param('id') id: string) {
    const avatar = this.avatarService.getAvatarById(id);
    if (!avatar) return { success: false, message: 'No encontrado' };
    return avatar;
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del catálogo' })
  getCatalogStats() {
    const stats = this.avatarService.getCatalogStats();
    if (!stats) return { success: false };
    return stats;
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar catálogo desde MinIO' })
  async refreshCatalog() {
    try {
      await this.avatarService.refreshCatalog();
      return { success: true, message: 'Catálogo refrescado' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}