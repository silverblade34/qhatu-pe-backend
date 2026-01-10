import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionModule } from '../subscription/subscription.module';
import { R2StorageService } from './services/r2-storage.service';
import { ImageOptimizationService } from './services/image-optimization.service';

@Module({
  imports: [ConfigModule, SubscriptionModule],
  controllers: [UploadController],
  providers: [UploadService, R2StorageService, ImageOptimizationService],
})
export class UploadModule { }
