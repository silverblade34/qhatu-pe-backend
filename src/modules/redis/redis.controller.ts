import { Controller, Get, Query } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
    constructor(
        private readonly redisService: RedisService,
    ) { }

    @Get('debug/keys')
    async debugKeys(@Query('pattern') pattern: string = '*') {
        const keys = await this.redisService.scanKeys(pattern);
        return { total: keys.length, keys };
    }
}
