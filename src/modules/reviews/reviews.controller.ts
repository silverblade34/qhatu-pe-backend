// src/modules/reviews/reviews.controller.ts

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
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { CanReviewDto } from './dto/can-review.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * Crear una nueva reseña (requiere autenticación)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  /**
   * GET /reviews/seller/:sellerId
   * Obtener todas las reseñas de un vendedor (público)
   */
  @Get('seller/:sellerId')
  async findBySeller(
    @Param('sellerId') sellerId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findBySellerById(
      sellerId,
      query.page,
      query.limit,
    );
  }

  /**
   * GET /reviews/product/:productId
   * Obtener reseñas de un producto específico (público)
   */
  @Get('product/:productId')
  async findByProduct(
    @Param('productId') productId: string,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.findByProductId(
      productId,
      query.page,
      query.limit,
    );
  }

  /**
   * GET /reviews/seller/:sellerId/stats
   * Obtener estadísticas de un vendedor (público)
   */
  @Get('seller/:sellerId/stats')
  async getSellerStats(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerRatingStats(sellerId);
  }

  /**
   * POST /reviews/can-review
   * Verificar si el usuario puede dejar una reseña
   */
  @Post('can-review')
  @UseGuards(JwtAuthGuard)
  async canReview(
    @CurrentUser() user: any,
    @Body() canReviewDto: CanReviewDto,
  ) {
    return this.reviewsService.canReview(
      user.id,
      canReviewDto.sellerId,
      canReviewDto.productId,
    );
  }

  /**
   * PATCH /reviews/:id
   * Actualizar una reseña (solo el autor)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.id, updateReviewDto);
  }

  /**
   * DELETE /reviews/:id
   * Eliminar una reseña (solo el autor)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reviewsService.remove(id, user.id);
  }
}