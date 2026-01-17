import { Module } from '@nestjs/common';
import { LiveEventController } from './live-event.controller';
import { LiveEventService } from './live-event.service';
import { DatabaseModule } from 'src/database/database.module';
import { LiveEventCron } from './live-event.cron';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [LiveEventController],
  providers: [LiveEventService, LiveEventCron],
  exports: [LiveEventService],
})
export class LiveEventModule { }