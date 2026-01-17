import { PartialType } from '@nestjs/swagger';
import { CreateLiveEventDto } from './create-live-event.dto';

export class UpdateLiveEventDto extends PartialType(CreateLiveEventDto) {}
