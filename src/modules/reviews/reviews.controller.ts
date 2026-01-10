import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { CacheKey } from 'src/common/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from 'src/common/interceptors/cache.interceptor';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly cacheInvalidation: CacheInvalidationService, // ⬅️ Inyectar
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    const result = await this.reviewsService.create(user.id, createReviewDto);
    
    // Invalidar reseñas del vendedor y del producto
    await this.cacheInvalidation.invalidateReviews(createReviewDto.sellerId);
    if (createReviewDto.productId) {
      await this.cacheInvalidation.invalidateProductReviews(createReviewDto.productId);
    }
    
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const result = await this.reviewsService.update(id, user.id, updateReviewDto);
    
    // Obtener sellerId y productId del resultado
    const review: any = result;
    await this.cacheInvalidation.invalidateReviews(review.sellerId);
    if (review.productId) {
      await this.cacheInvalidation.invalidateProductReviews(review.productId);
    }
    
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.reviewsService.remove(id, user.id);
    
    const review: any = result;
    await this.cacheInvalidation.invalidateReviews(review.sellerId);
    if (review.productId) {
      await this.cacheInvalidation.invalidateProductReviews(review.productId);
    }
    
    return result;
  }

  // Agregar cache a endpoints públicos
  @Get('seller/:sellerId')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('reviews_seller')
  async findBySeller(
    @Param('sellerId') sellerId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findBySellerById(sellerId, query.page, query.limit);
  }

  @Get('product/:productId')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('reviews_product')
  async findByProduct(
    @Param('productId') productId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findByProductId(productId, query.page, query.limit);
  }

  @Get('seller/:sellerId/stats')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('reviews_stats')
  async getSellerStats(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerRatingStats(sellerId);
  }
}