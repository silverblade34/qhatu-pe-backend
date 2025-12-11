import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductCategoryDto {
    @ApiProperty({ example: 'Polos' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    name: string;

    @ApiProperty({ example: 'Polos', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: '👕', required: false })
    @IsOptional()
    @IsString()
    icon?: string;
}
