import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RedisModule } from '../redis/redis.module';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CacheInvalidationService],
  exports: [CategoriesService],
})
export class CategoriesModule { }
