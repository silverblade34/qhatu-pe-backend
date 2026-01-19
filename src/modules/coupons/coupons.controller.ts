import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FilterCouponDto } from './dto/filter-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { CacheKey } from 'src/common/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createCouponDto: CreateCouponDto,
  ) {
    const result = await this.couponsService.create(user.id, createCouponDto);
    await this.cacheInvalidation.invalidateCoupons(user.id);
    await this.cacheInvalidation.invalidateStoreProfile(user.id);
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    const result = await this.couponsService.update(user.id, couponId, updateCouponDto);
    await this.cacheInvalidation.invalidateCoupons(user.id);
    await this.cacheInvalidation.invalidateStoreProfile(user.id);
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@CurrentUser() user: any, @Param('id') couponId: string) {
    const result = await this.couponsService.delete(user.id, couponId);
    await this.cacheInvalidation.invalidateCoupons(user.id);
    await this.cacheInvalidation.invalidateStoreProfile(user.id);
    return result;
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleStatus(@CurrentUser() user: any, @Param('id') couponId: string) {
    const result = await this.couponsService.toggleStatus(user.id, couponId);
    await this.cacheInvalidation.invalidateCoupons(user.id);
    await this.cacheInvalidation.invalidateStoreProfile(user.id);
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSellerCoupons(
    @CurrentUser() user: any,
    @Query() filters: FilterCouponDto,
  ) {
    return this.couponsService.getSellerCoupons(user.id, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getCouponById(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.getCouponById(user.id, couponId);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getCouponStats(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.getCouponStats(user.id, couponId);
  }

  @Post('validate/:username')
  async validateCoupon(
    @Param('username') username: string,
    @Body() validateDto: ValidateCouponDto,
  ) {
    return this.couponsService.validateCoupon(
      username,
      validateDto.code,
      validateDto.subtotal,
      validateDto.productIds,
    );
  }

  @Get('public/:username')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('coupons_public')
  async getPublicActiveCoupons(@Param('username') username: string) {
    return this.couponsService.getPublicActiveCoupons(username);
  }
}