import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { CacheInvalidationService } from './cache-invalidation.service';

@Module({
  controllers: [RedisController],
  providers: [CacheInvalidationService],
  exports: [CacheInvalidationService],
})
export class RedisModule {}
