import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todas las categorías' })
  async getAllCategories() {
    return this.categoriesService.findAll();
  }

  // PÚBLICO - Obtener estadísticas de categoría (cuántas tiendas hay)
  @Public()
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de una categoría' })
  async getCategoryStats(@Param('id') id: string) {
    return this.categoriesService.getCategoryStats(id);
  }

  // ADMIN - Crear categoría
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nueva categoría (Solo Admin)' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // ADMIN - Actualizar categoría
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar categoría (Solo Admin)' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // ADMIN - Eliminar categoría
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar categoría (Solo Admin)' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}