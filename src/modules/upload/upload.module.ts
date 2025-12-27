import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [ConfigModule, SubscriptionModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule { }
