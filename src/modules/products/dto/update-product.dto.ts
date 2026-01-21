import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Polo Oversize Negro', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Polo 100% algodón, diseño moderno' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'clxxxxxx',
    description: 'ID de la categoría (null para quitar categoría)'
  })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ example: 45.00, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 45.00, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 45.00, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    example: ['polo', 'anime'],
    description: 'Caracteristicas cortas del producto',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Si es oferta flash' })
  @IsOptional()
  @IsBoolean()
  isFlashSale?: boolean;

  @ApiPropertyOptional({ description: 'Si es producto destacado' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Si es próximamente' })
  @IsOptional()
  @IsBoolean()
  isComingSoon?: boolean;

  @ApiPropertyOptional({
    example: ['https://ejemplo.com/imagen1.jpg'],
    description: 'URLs de las imágenes',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: [CreateVariantDto],
    description: 'Variantes del producto'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}