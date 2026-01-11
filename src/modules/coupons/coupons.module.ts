import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, SubscriptionModule, RedisModule],
  controllers: [CouponsController],
  providers: [CouponsService],
})
export class CouponsModule { }
