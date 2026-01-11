import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class BillingCronService {
  constructor(private billingService: BillingService) {}

  // Ejecutar todos los días a las 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleOverduePayments() {
    console.log('🔍 Verificando pagos vencidos...');
    await this.billingService.checkOverduePayments();
  }
}