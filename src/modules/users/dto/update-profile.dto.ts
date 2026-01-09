import { IsString, IsOptional, MaxLength, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SocialLinkDto {
  @ApiProperty({ example: 'INSTAGRAM' })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'https://instagram.com/ropamoda_pe' })
  @IsUrl()
  url: string;
}

export class UpdateProfileDto {
  fullName?: string;
  phone?: string;
  storeName?: string;
  bio?: string;
  logo?: string;
  whatsapp?: string;
  categoryId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  allowReviews?: boolean;
  showStock?: boolean;
  showSoldOut?: boolean;
  requirePhone?: boolean;
  requireEmail?: boolean;
  requireAddress?: boolean;
  socialLinks?: Array<{
    platform: string;
    url: string;
    order?: number;
  }>;
}
