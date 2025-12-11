import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Ropa y Moda' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'ropa-moda' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug solo puede contener letras minúsculas, números y guiones',
  })
  slug: string;

  @ApiProperty({ example: 'Prendas de vestir y accesorios', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '👕', required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
