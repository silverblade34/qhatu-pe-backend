import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { DatabaseModule } from 'src/database/database.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule { }
