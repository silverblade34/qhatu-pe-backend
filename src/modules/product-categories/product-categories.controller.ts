import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { HttpCacheInterceptor } from 'src/common/interceptors/cache.interceptor';
import { CacheKey } from 'src/common/decorators/cache-key.decorator';

@ApiTags('Product Categories')
@Controller('product-categories')
@ApiBearerAuth()
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('product_categories')
  async getMyCategories(@CurrentUser() user: any) {
    return this.productCategoriesService.findAllByUser(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createCategory(@CurrentUser() user: any, @Body() body: CreateProductCategoryDto) {
    const result = await this.productCategoriesService.create(user.id, body);
    await this.cacheInvalidation.invalidateProductCategories(user.id);
    return result;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateCategory(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: UpdateProductCategoryDto
  ) {
    const result = await this.productCategoriesService.update(id, user.id, body);
    await this.cacheInvalidation.invalidateProductCategories(user.id);
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCategory(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.productCategoriesService.delete(id, user.id);
    await this.cacheInvalidation.invalidateProductCategories(user.id);
    return result;
  }
}