import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ProductVariantsService } from './services/product-variants.service';
import { ProductStockService } from './services/product-stock.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductVariantsService, ProductStockService],
})
export class ProductsModule { }
