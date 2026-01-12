import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { CacheKey } from 'src/common/decorators/cache-key.decorator';
import { HttpCacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  /**
   * Genera el mensaje de WhatsApp sin crear la orden
   * Endpoint PÚBLICO (el cliente lo usa desde el catálogo)
   */
  @Post('whatsapp-message')
  async generateWhatsAppMessage(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.generateWhatsAppMessage(createOrderDto);
  }

  /**
   * Crea una orden real (el vendedor confirma la venta)
   * Requiere autenticación
   */
  @Post()
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const result = await this.ordersService.create(createOrderDto);

    const order: any = result;
    await this.cacheInvalidation.invalidateOrders(createOrderDto.storeUserId);

    return result;
  }

  /**
   * Actualiza el estado de una orden
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    const result = await this.ordersService.updateStatus(user.id, orderId, updateDto);
    await this.cacheInvalidation.invalidateOrders(user.id);
    return result;
  }

  /**
   * Lista todas las órdenes del vendedor con filtros
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('orders_seller')
  async getSellerOrders(
    @CurrentUser() user: any,
    @Query() filters: FilterOrderDto,
  ) {
    return this.ordersService.getSellerOrders(user.id, filters);
  }

  /**
   * Estadísticas de ventas del vendedor
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('orders_stats')
  async getSellerStats(@CurrentUser() user: any) {
    return this.ordersService.getSellerStats(user.id);
  }

  /**
   * Obtiene una orden específica
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getOrderById(user.id, orderId);
  }
}