import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsUrl, 
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength
} from 'class-validator';
import { BannerType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  imageDesktop: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  imageMobile: string;

  @ApiPropertyOptional({ enum: BannerType })
  @IsOptional()
  @IsEnum(BannerType)
  type?: BannerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ctaText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  ctaLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showButton?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}