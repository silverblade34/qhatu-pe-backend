import { IsString, IsEnum, IsUrl, IsArray, IsBoolean, IsOptional, IsDateString, ArrayMaxSize } from 'class-validator';

export enum LivePlatform {
    TIKTOK = 'TIKTOK',
    INSTAGRAM = 'INSTAGRAM',
    FACEBOOK = 'FACEBOOK',
    YOUTUBE = 'YOUTUBE',
    CUSTOM = 'CUSTOM',
}

export class CreateLiveEventDto {
    @IsString()
    title: string;

    @IsEnum(LivePlatform)
    platform: LivePlatform;

    @IsUrl()
    liveUrl: string;

    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    @IsOptional()
    featuredProductIds?: string[];

    @IsBoolean()
    @IsOptional()
    startNow?: boolean; // true = iniciar inmediatamente

    @IsDateString()
    @IsOptional()
    scheduledStartAt?: string; // Fecha programada de inicio

    @IsDateString()
    @IsOptional()
    scheduledEndAt?: string; // Fecha programada de fin
}