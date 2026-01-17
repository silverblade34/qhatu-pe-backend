import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsObject,
  IsBoolean
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ example: 'M - Rojo', description: 'Nombre de la variante' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'SKU-001', description: 'SKU único' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ 
    example: 45.50, 
    description: 'Precio específico de la variante (opcional, hereda del producto si no se especifica)' 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ 
    example: 60.00, 
    minimum: 0,
    description: 'Precio de comparación (opcional, hereda del producto si no se especifica)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ 
    example: 20.00, 
    minimum: 0,
    description: 'Costo de la variante (opcional, hereda del producto si no se especifica)'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ example: 10, description: 'Stock disponible de esta variante' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    example: { talla: 'M', color: 'Rojo' },
    description: 'Atributos de la variante'
  })
  @IsObject()
  attributes: Record<string, string>;

  @ApiPropertyOptional({ description: 'Si la variante está activa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}