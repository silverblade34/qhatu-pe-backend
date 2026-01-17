import { IsString, IsUUID } from 'class-validator';

export class PinProductDto {
  @IsUUID()
  @IsString()
  productId: string;
}