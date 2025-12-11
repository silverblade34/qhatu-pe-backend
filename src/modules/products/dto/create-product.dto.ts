import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum ProductCategory {
  ROPA = 'ROPA',
  BELLEZA = 'BELLEZA',
  TECNOLOGIA = 'TECNOLOGIA',
  HOGAR = 'HOGAR',
  ACCESORIOS = 'ACCESORIOS',
  OTRO = 'OTRO',
}

class VariantDto {
  @ApiProperty({ example: 'SIZE' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  value: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  priceModifier?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Polo Oversize Negro' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Polo de algodón 100% peruano...' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ enum: ProductCategory, example: 'ROPA' })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ example: 45.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: ['https://...', 'https://...'] })
  @IsArray()
  @IsUrl({}, { each: true })
  images: string[];

  @ApiProperty({ type: [VariantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFlashSale?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isComingSoon?: boolean;
}