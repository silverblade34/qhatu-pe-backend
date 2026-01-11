import { Module } from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesController } from './product-categories.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RedisModule } from '../redis/redis.module';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, CacheInvalidationService],
})
export class ProductCategoriesModule { }
