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

@Controller('live-events')
export class LiveEventController {
  constructor(private readonly liveEventService: LiveEventService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: any,
    @Body() createDto: CreateLiveEventDto,
  ) {
    return this.liveEventService.create(user.id, createDto);
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
  getActive(@Param('username') username: string) {
    return this.liveEventService.getActiveByUsername(username);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  start(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.liveEventService.start(id, user.id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  end(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.liveEventService.end(id, user.id);
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard)
  pinProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PinProductDto,
  ) {
    return this.liveEventService.pinProduct(id, user.id, dto.productId);
  }

  @Post(':id/unpin')
  @UseGuards(JwtAuthGuard)
  unpinProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.liveEventService.unpinProduct(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.liveEventService.delete(id, user.id);
  }
}