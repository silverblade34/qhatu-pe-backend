import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { DiscountType, CouponStatus } from '@prisma/client';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código solo puede contener letras mayúsculas y números',
  })
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;
}