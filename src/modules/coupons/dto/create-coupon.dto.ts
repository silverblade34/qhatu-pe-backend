import {
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsInt,
  IsDateString,
  MaxLength,
  Matches,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código solo puede contener letras mayúsculas y números',
  })
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

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

  // Modo temporal para lives
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean; // Indica si es un cupón temporal

  @ValidateIf(o => o.isTemporary === true)
  @IsInt()
  @Min(1)
  @Max(120) // Máximo 2 horas (120 minutos)
  temporaryDurationMinutes?: number; // Duración en minutos

  // Fechas tradicionales (se ignoran si isTemporary = true)
  @ValidateIf(o => !o.isTemporary)
  @IsDateString()
  startDate?: string;

  @ValidateIf(o => !o.isTemporary)
  @IsDateString()
  endDate?: string;
}