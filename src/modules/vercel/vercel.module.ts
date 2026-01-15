import { Module } from '@nestjs/common';
import { VercelService } from './vercel.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [VercelService],
  exports: [VercelService]
})
export class VercelModule {}
