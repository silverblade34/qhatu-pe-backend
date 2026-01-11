import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, RedisModule],
  controllers: [OrdersController],
  providers: [OrdersService, CacheInvalidationService],
})
export class OrdersModule { }
