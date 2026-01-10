import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilterProductDto } from './dto/filter-product.dto';
import { HttpCacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheKey } from '../../common/decorators/cache-key.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  // ENDPOINT PÚBLICO - Listar productos de una tienda (CON CACHE)
  @Public()
  @Get('store/:username')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('store_products')
  @ApiOperation({ summary: 'Obtener productos públicos de una tienda' })
  async getStoreProducts(
    @Param('username') username: string,
    @Query() filters: FilterProductDto,
  ) {
    return this.productsService.getPublicProducts(username, filters);
  }

  // ENDPOINT PÚBLICO - Ver detalle de producto (CON CACHE)
  @Public()
  @Get('store/:username/:slug')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('product_detail')
  @ApiOperation({ summary: 'Obtener detalle de producto público' })
  async getProductDetail(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.productsService.getProductBySlug(username, slug);
  }

  // ENDPOINT PROTEGIDO - Mis productos (SIN CACHE, datos privados)
  @UseGuards(JwtAuthGuard)
  @Get('my-products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mis productos (vendedor)' })
  async getMyProducts(
    @CurrentUser() user: any,
    @Query() filters: FilterProductDto,
  ) {
    return this.productsService.getSellerProducts(user.id, filters);
  }

  // ENDPOINT PROTEGIDO - Crear producto (INVALIDA CACHE)
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async createProduct(
    @CurrentUser() user: any,
    @Body() createProductDto: CreateProductDto,
  ) {
    const result = await this.productsService.create(user.id, createProductDto);

    // Invalidar productos de la tienda
    await this.cacheInvalidation.invalidateProductChanges(user.username);

    return result;
  }

  // ENDPOINT PROTEGIDO - Obtener producto para editar
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener producto por ID (vendedor)' })
  async getProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.getProductById(user.id, id);
  }

  // ENDPOINT PROTEGIDO - Actualizar producto (INVALIDA CACHE)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar producto' })
  async updateProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const result = await this.productsService.update(user.id, id, updateProductDto);

    await this.cacheInvalidation.invalidateProductChanges(user.username, result.slug);

    return result;
  }

  // ENDPOINT PROTEGIDO - Eliminar producto (INVALIDA CACHE)
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar producto' })
  async deleteProduct(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.productsService.delete(user.id, id);
    await this.cacheInvalidation.invalidateProductChanges(user.username);
    return result;
  }

  // ENDPOINT PROTEGIDO - Duplicar producto
  @UseGuards(JwtAuthGuard)
  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicar producto' })
  async duplicateProduct(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.productsService.duplicate(user.id, id);
    await this.cacheInvalidation.invalidateProductChanges(user.username);
    return result;
  }

  // ENDPOINT PROTEGIDO - Stock bajo
  @UseGuards(JwtAuthGuard)
  @Get('my-products/low-stock')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener productos con stock bajo' })
  async getLowStockProducts(@CurrentUser() user: any) {
    return this.productsService.getLowStockProducts(user.id);
  }
}