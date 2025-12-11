import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Buscar tiendas' })
  @ApiQuery({ name: 'q', required: false, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'category', required: false, description: 'Filtrar por categoría' })
  @ApiQuery({ name: 'verified', required: false, description: 'Solo tiendas verificadas' })
  @ApiQuery({ name: 'hasOffers', required: false, description: 'Solo tiendas con ofertas' })
  @ApiQuery({ name: 'sort', required: false, description: 'Ordenar por: rating, products, newest' })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página' })
  async searchStores(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('verified') verified?: string,
    @Query('hasOffers') hasOffers?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.searchStores({
      query,
      category,
      verified: verified === 'true',
      hasOffers: hasOffers === 'true',
      sort: sort as any,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
    });
  }

  // OBTENER TIENDA POR USERNAME (página pública de la tienda)
  @Public()
  @Get(':username')
  @ApiOperation({ summary: 'Obtener tienda por username' })
  async getStoreByUsername(@Param('username') username: string) {
    return this.storesService.getStoreByUsername(username);
  }

  // OBTENER TIENDAS DESTACADAS
  @Public()
  @Get('featured/list')
  @ApiOperation({ summary: 'Obtener tiendas destacadas' })
  async getFeaturedStores(@Query('limit') limit?: string) {
    return this.storesService.getFeaturedStores(parseInt(limit) || 8);
  }

  // OBTENER TIENDAS POR CATEGORÍA
  @Public()
  @Get('category/:slug')
  @ApiOperation({ summary: 'Obtener tiendas por categoría' })
  async getStoresByCategory(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getStoresByCategory(slug, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
    });
  }
}