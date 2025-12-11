import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  Min, 
  IsObject
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

  @ApiPropertyOptional({ example: 45.50, description: 'Precio específico de la variante' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 10, description: 'Stock disponible' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    example: { talla: 'M', color: 'Rojo' },
    description: 'Atributos de la variante' 
  })
  @IsObject()
  attributes: Record<string, string>;
}