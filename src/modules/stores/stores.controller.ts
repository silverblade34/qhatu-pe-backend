import {
  Controller,
  Get,
  Query,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StoresService } from './stores.service';
import { HttpCacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheKey } from '../../common/decorators/cache-key.decorator';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
  ) { }

  // BÚSQUEDA DE TIENDAS (CON CACHE)
  @Public()
  @Get('search')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('stores_search')
  @ApiOperation({ summary: 'Buscar tiendas' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Término de búsqueda',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoría',
  })
  @ApiQuery({
    name: 'verified',
    required: false,
    description: 'Solo tiendas verificadas',
  })
  @ApiQuery({
    name: 'hasOffers',
    required: false,
    description: 'Solo tiendas con ofertas',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Ordenar por: rating, products, newest',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite por página',
  })
  async searchStores(
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('verified') verified?: string,
    @Query('hasOffers') hasOffers?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.searchStores({
      query,
      categoryId,
      verified: verified === 'true',
      hasOffers: hasOffers === 'true',
      sort: sort as any,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
    });
  }

  // TIENDAS DESTACADAS (CON CACHE - muy estático)
  @Public()
  @Get('featured/list')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('stores_featured')
  @ApiOperation({ summary: 'Obtener tiendas destacadas' })
  async getFeaturedStores(@Query('limit') limit?: string) {
    return this.storesService.getFeaturedStores(parseInt(limit) || 8);
  }

  // TIENDAS POR CATEGORÍA (CON CACHE)
  @Public()
  @Get('category/:id')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('stores_by_category')
  @ApiOperation({ summary: 'Obtener tiendas por categoría' })
  async getStoresByCategory(
    @Param('id') categoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getStoresByCategory(categoryId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 12,
    });
  }

  // CATEGORÍAS DE PRODUCTOS DE LA TIENDA (CON CACHE)
  @Public()
  @Get('product-categories/:username')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('store_product_categories')
  @ApiOperation({ summary: 'Obtener categorías de productos de una tienda' })
  async getStoreProductCategories(@Param('username') username: string) {
    return this.storesService.getStoreProductCategories(username);
  }

  // PERFIL DE TIENDA (CON CACHE)
  @Public()
  @Get(':username')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('store_profile')
  @ApiOperation({ summary: 'Obtener tienda por username' })
  async getStoreByUsername(@Param('username') username: string) {
    return this.storesService.getStoreByUsername(username);
  }
}