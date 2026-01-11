import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, RedisModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule { }
