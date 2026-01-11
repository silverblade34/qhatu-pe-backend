import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { CacheInvalidationService } from './cache-invalidation.service';
import { RedisService } from './redis.service';

@Module({
  controllers: [RedisController],
  providers: [CacheInvalidationService, RedisService],
  exports: [CacheInvalidationService, RedisService],
})
export class RedisModule {}
