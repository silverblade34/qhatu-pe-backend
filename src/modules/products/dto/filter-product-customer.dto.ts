import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOption {
  FEATURED = 'featured',
  PRICE_ASC = 'price-asc',
  PRICE_DESC = 'price-desc',
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export enum PriceRange {
  UNDER_50 = 'under-50',
  RANGE_50_100 = '50-100',
  RANGE_100_200 = '100-200',
  OVER_200 = 'over-200',
}

export class FilterProductDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre de producto' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría (slug)' })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ 
    description: 'Ordenamiento',
    enum: SortOption,
    default: SortOption.FEATURED 
  })
  @IsOptional()
  @IsEnum(SortOption)
  sortBy?: SortOption;

  @ApiPropertyOptional({ 
    description: 'Rango de precio',
    enum: PriceRange 
  })
  @IsOptional()
  @IsEnum(PriceRange)
  priceRange?: PriceRange;

  @ApiPropertyOptional({ description: 'Solo productos con descuento (Flash Sale)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Solo productos en stock' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyInStock?: boolean;

  @ApiPropertyOptional({ description: 'Precio mínimo personalizado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Precio máximo personalizado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Límite de resultados', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset para paginación', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Página actual (alternativa a offset)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;
}