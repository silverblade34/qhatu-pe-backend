import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LiveEventService } from './live-event.service';
import { CreateLiveEventDto } from './dto/create-live-event.dto';
import { PinProductDto } from './dto/pin-product.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Controller('live-events')
export class LiveEventController {
  constructor(
    private readonly liveEventService: LiveEventService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createDto: CreateLiveEventDto,
  ) {
    const response = await this.liveEventService.create(user.id, createDto);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: any) {
    return this.liveEventService.findAll(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.liveEventService.findOne(id, user.id);
  }

  @Get('active/:username')
  async getActive(@Param('username') username: string) {
    const response = await this.liveEventService.getActiveByUsername(username);
    return response;
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async start(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const response = await this.liveEventService.start(id, user.id);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  async end(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const response = await this.liveEventService.end(id, user.id);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard)
  async pinProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PinProductDto,
  ) {
    const response = await this.liveEventService.pinProduct(id, user.id, dto.productId);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }

  @Post('/updateProducts')
  @UseGuards(JwtAuthGuard)
  async updateProduct(
    @CurrentUser() user: any,
    @Body() dto: { products: string[], eventId: string },
  ) {
    const response = await this.liveEventService.updateProducts(dto.products, user.id, dto.eventId);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }


  @Post(':id/unpin')
  @UseGuards(JwtAuthGuard)
  async unpinProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const response = await this.liveEventService.unpinProduct(id, user.id);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const response = await this.liveEventService.delete(id, user.id);
    await this.cacheInvalidation.invalidateStoreCompletely(user.username);
    return response;
  }
}