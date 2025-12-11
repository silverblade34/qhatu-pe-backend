import { IsString, IsNumber, IsArray, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}