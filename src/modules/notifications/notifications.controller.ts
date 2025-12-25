import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('count')
  async getCount(@CurrentUser() user: any) {
    return this.notificationsService.getNotificationCount(user.id);
  }
}
