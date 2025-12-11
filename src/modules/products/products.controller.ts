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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilterProductDto } from './dto/filter-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ENDPOINT PÚBLICO - Listar productos de una tienda
  @Public()
  @Get('store/:username')
  @ApiOperation({ summary: 'Obtener productos públicos de una tienda' })
  async getStoreProducts(
    @Param('username') username: string,
    @Query() filters: FilterProductDto,
  ) {
    return this.productsService.getPublicProducts(username, filters);
  }

  // ENDPOINT PÚBLICO - Ver detalle de producto
  @Public()
  @Get('store/:username/:slug')
  @ApiOperation({ summary: 'Obtener detalle de producto público' })
  async getProductDetail(
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    return this.productsService.getProductBySlug(username, slug);
  }

  // ENDPOINT PROTEGIDO - Mis productos (dashboard)
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

  // ENDPOINT PROTEGIDO - Crear producto
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async createProduct(
    @CurrentUser() user: any,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(user.id, createProductDto);
  }

  // ENDPOINT PROTEGIDO - Obtener producto para editar
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener producto por ID (vendedor)' })
  async getProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.getProductById(user.id, id);
  }

  // ENDPOINT PROTEGIDO - Actualizar producto
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar producto' })
  async updateProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(user.id, id, updateProductDto);
  }

  // ENDPOINT PROTEGIDO - Eliminar producto
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar producto' })
  async deleteProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.delete(user.id, id);
  }

  // ENDPOINT PROTEGIDO - Duplicar producto
  @UseGuards(JwtAuthGuard)
  @Post(':id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicar producto' })
  async duplicateProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.duplicate(user.id, id);
  }
}