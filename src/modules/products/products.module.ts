import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ProductVariantsService } from './services/product-variants.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { RedisModule } from '../redis/redis.module';
import { CacheInvalidationService } from '../redis/cache-invalidation.service';

@Module({
  imports: [DatabaseModule, SubscriptionModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductVariantsService, CacheInvalidationService],
})
export class ProductsModule { }
