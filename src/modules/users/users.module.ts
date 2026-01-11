import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { DatabaseModule } from 'src/database/database.module';
import { BannerService } from './services/banner.service';
import { RedisModule } from '../redis/redis.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [DatabaseModule, RedisModule, SubscriptionModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileService,
    BannerService,
  ],
  exports: [UsersService],
})
export class UsersModule {}