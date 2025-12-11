import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@ApiTags('Product Categories')
@Controller('product-categories')
@ApiBearerAuth()
export class ProductCategoriesController {
  constructor(private readonly productCategoriesService: ProductCategoriesService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener categorías de productos del usuario (crea las default si es primera vez)' })
  async getMyCategories(@CurrentUser() user: any) {
    return this.productCategoriesService.findAllByUser(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear nueva categoría de producto personalizada' })
  async createCategory(@CurrentUser() user: any, @Body() body: CreateProductCategoryDto) {
    return this.productCategoriesService.create(user.id, body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar categoría de producto' })
  async updateCategory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: UpdateProductCategoryDto
  ) {
    return this.productCategoriesService.update(id, user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar categoría de producto' })
  async deleteCategory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productCategoriesService.delete(id, user.id);
  }
}