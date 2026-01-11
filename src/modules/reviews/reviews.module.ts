import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, RedisModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, CacheInvalidationService],
})
export class ReviewsModule {}
