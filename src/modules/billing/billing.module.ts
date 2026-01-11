import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingCronService } from './billing.cron';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [BillingService, BillingCronService],
  exports: [BillingService],
})
export class BillingModule { }
