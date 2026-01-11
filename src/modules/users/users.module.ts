import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { DatabaseModule } from 'src/database/database.module';
import { BannerService } from './services/banner.service';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileService,
    BannerService,
    CacheInvalidationService
  ],
  exports: [UsersService],
})
export class UsersModule {}