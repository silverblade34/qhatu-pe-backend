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
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { FilterCouponDto } from './dto/filter-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) { }

  /**
   * POST /coupons
   * Crea un nuevo cupón
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createCouponDto: CreateCouponDto,
  ) {
    return this.couponsService.create(user.id, createCouponDto);
  }

  /**
   * PATCH /coupons/:id
   * Actualiza un cupón
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.update(user.id, couponId, updateCouponDto);
  }

  /**
   * DELETE /coupons/:id
   * Elimina un cupón (solo si no fue usado)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.delete(user.id, couponId);
  }

  /**
   * PATCH /coupons/:id/toggle
   * Activa/Desactiva un cupón rápidamente (útil para lives)
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleStatus(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.toggleStatus(user.id, couponId);
  }

  /**
   * GET /coupons
   * Lista todos los cupones del vendedor
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getSellerCoupons(
    @CurrentUser() user: any,
    @Query() filters: FilterCouponDto,
  ) {
    return this.couponsService.getSellerCoupons(user.id, filters);
  }

  /**
   * GET /coupons/:id
   * Obtiene un cupón específico con sus detalles
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getCouponById(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.getCouponById(user.id, couponId);
  }

  /**
   * GET /coupons/:id/stats
   * Estadísticas de uso del cupón
   */
  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getCouponStats(
    @CurrentUser() user: any,
    @Param('id') couponId: string,
  ) {
    return this.couponsService.getCouponStats(user.id, couponId);
  }

  /**
   * POST /coupons/validate/:username
   * Valida un cupón (endpoint público para clientes)
   */
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

  /**
   * GET /coupons/public/:username
   * Obtiene cupones activos públicamente (para mostrar en catálogo)
   */
  @Get('public/:username')
  async getPublicActiveCoupons(@Param('username') username: string) {
    return this.couponsService.getPublicActiveCoupons(username);
  }
}