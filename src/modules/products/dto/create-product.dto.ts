import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  MaxLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Polo Oversize Negro', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Polo 100% algodón, diseño moderno' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    example: 'clxxxxxx',
    description: 'ID de la categoría de producto (opcional, categorías personalizadas del vendedor)'
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ 
    example: 45.00, 
    minimum: 0,
    description: 'Precio base del producto (opcional si tiene variantes con precio propio)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ 
    example: 60.00, 
    minimum: 0,
    description: 'Precio de comparación (opcional, heredado por variantes si no especifican el suyo)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ 
    example: 20.00, 
    minimum: 0,
    description: 'Costo del producto (opcional, heredado por variantes si no especifican el suyo)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    example: ['polo', 'anime'],
    description: 'Características cortas del producto',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    example: 50, 
    minimum: 0,
    description: 'Stock inicial (se recalcula automáticamente si hay variantes)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({
    example: ['https://ejemplo.com/imagen1.jpg', 'https://ejemplo.com/imagen2.jpg'],
    description: 'URLs de las imágenes (máximo 5)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    type: [CreateVariantDto],
    description: 'Variantes del producto (tallas, colores, etc.)'
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

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
}