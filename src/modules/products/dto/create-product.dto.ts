import { 
  IsString, 
  IsNumber, 
  IsArray, 
  IsOptional, 
  Min, 
  MaxLength,
  ValidateNested,
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

  @ApiProperty({ example: 45.00, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50, minimum: 0 })
  @IsNumber()
  @Min(0)
  stock: number;

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
}

