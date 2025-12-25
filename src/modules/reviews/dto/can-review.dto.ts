import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CanReviewDto {
  @IsUUID()
  @IsString()
  sellerId: string;

  @IsUUID()
  @IsString()
  @IsOptional()
  productId?: string;
}