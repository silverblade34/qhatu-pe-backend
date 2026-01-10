import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { CacheKey } from 'src/common/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  @Public()
  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('categories')
  async getAllCategories() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id/stats')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('category_stats')
  async getCategoryStats(@Param('id') id: string) {
    return this.categoriesService.getCategoryStats(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const result = await this.categoriesService.create(createCategoryDto);
    await this.cacheInvalidation.invalidateCategories();
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const result = await this.categoriesService.update(id, updateCategoryDto);
    await this.cacheInvalidation.invalidateCategories();
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    const result = await this.categoriesService.delete(id);
    await this.cacheInvalidation.invalidateCategories();
    return result;
  }
}