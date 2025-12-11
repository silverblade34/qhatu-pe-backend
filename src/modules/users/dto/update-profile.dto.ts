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
  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ example: '+51999888777', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Ropa Moda Perú', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storeName?: string;

  @ApiProperty({ example: 'Ropa trendy para ti 🔥', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  bio?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsOptional()
  @IsUrl()
  banner?: string;

  @ApiProperty({ example: '+51999888777', required: false })
  @IsOptional()
  @IsString()
  storePhone?: string;

  @ApiProperty({ type: [SocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}