import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ProductVariantsService } from './services/product-variants.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { RedisModule } from '../redis/redis.module';
import { ProductImageService } from './services/product-image.service';
import { ProductQueryService } from './services/product-query.service';
import { ProductSkuService } from './services/product-sku.service';
import { ProductSlugService } from './services/product-slug.service';
import { ProductValidationService } from './services/product-validation.service';

@Module({
  imports: [DatabaseModule, SubscriptionModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductVariantsService, ProductImageService, 
    ProductQueryService, ProductSkuService, ProductSlugService, ProductValidationService
  ],
})
export class ProductsModule { }
