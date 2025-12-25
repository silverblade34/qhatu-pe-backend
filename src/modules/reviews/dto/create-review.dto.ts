import { IsString, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  @IsString()
  sellerId: string;

  @IsUUID()
  @IsString()
  @IsOptional()
  productId?: string;

  @IsInt()
  @Min(1, { message: 'La calificación mínima es 1 estrella' })
  @Max(5, { message: 'La calificación máxima es 5 estrellas' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
