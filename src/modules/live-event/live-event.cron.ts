import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LiveEventService } from './live-event.service';

@Injectable()
export class LiveEventCron {
  constructor(private liveEventService: LiveEventService) {}

  // Revisar cada minuto si hay lives que activar
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledActivation() {
    await this.liveEventService.activateScheduledLives();
  }

  // Revisar cada minuto si hay lives que finalizar
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledEnd() {
    await this.liveEventService.endScheduledLives();
  }
}