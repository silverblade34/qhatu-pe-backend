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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilterProductSellerDto } from './dto/filter-product-seller.dto';
import { HttpCacheInterceptor } from '../../common/interceptors/cache.interceptor';
import { CacheKey } from '../../common/decorators/cache-key.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { FilterProductDto, PriceRange, SortOption } from './dto/filter-product-customer.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  @Public()
  @Get('store/:username')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('store_products')
  @ApiOperation({
    summary: 'Obtener productos públicos de una tienda con filtros avanzados',
    description: `
      Endpoint público para listar productos de una tienda con:
      - Búsqueda por nombre
      - Filtro por categoría
      - Ordenamiento (destacados, precio, popularidad, fecha)
      - Rango de precios predefinidos o personalizados
      - Filtro por descuento (Flash Sales)
      - Filtro por disponibilidad (stock)
      - Paginación
      - Prioridad automática para productos en Live activo
    `,
  })
  @ApiParam({
    name: 'username',
    description: 'Username de la tienda',
    example: 'blackcat',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar productos por nombre',
    example: 'Jordan',
  })
  @ApiQuery({
    name: 'categorySlug',
    required: false,
    description: 'Filtrar por categoría (slug)',
    example: 'zapatillas',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: SortOption,
    description: 'Ordenar productos',
    example: SortOption.PRICE_ASC,
  })
  @ApiQuery({
    name: 'priceRange',
    required: false,
    enum: PriceRange,
    description: 'Rango de precio predefinido',
    example: PriceRange.RANGE_50_100,
  })
  @ApiQuery({
    name: 'onlyDiscount',
    required: false,
    type: Boolean,
    description: 'Solo productos con descuento (Flash Sale)',
    example: true,
  })
  @ApiQuery({
    name: 'onlyInStock',
    required: false,
    type: Boolean,
    description: 'Solo productos disponibles en stock',
    example: true,
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Precio mínimo personalizado (sobrescribe priceRange)',
    example: 50,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Precio máximo personalizado (sobrescribe priceRange)',
    example: 150,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (alternativa a offset)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Productos por página',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos con metadata',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number' },
              salePrice: { type: 'number', nullable: true },
              compareAtPrice: { type: 'number', nullable: true },
              stock: { type: 'number' },
              isFlashSale: { type: 'boolean' },
              isFeatured: { type: 'boolean' },
              isNewArrival: { type: 'boolean' },
              isComingSoon: { type: 'boolean' },
              isLiveFeatured: { type: 'boolean' },
              isPinnedInLive: { type: 'boolean' },
              hasDiscount: { type: 'boolean' },
              rating: {
                type: 'object',
                properties: {
                  average: { type: 'number' },
                  count: { type: 'number' },
                },
              },
              category: {
                type: 'object',
                nullable: true,
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
              images: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    altText: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
        hasActiveLive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
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
    @Query() filters: FilterProductSellerDto,
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