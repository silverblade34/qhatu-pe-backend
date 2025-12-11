import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterSellerDto {
  // DATOS PERSONALES
  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'juan@email.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: '+51999888777' })
  @IsString()
  @Matches(/^\+51[0-9]{9}$/, {
    message: 'Teléfono debe ser formato peruano: +51999888777',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  // DATOS DE LA TIENDA
  @ApiProperty({ example: 'Ropa Moda Perú' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  storeName: string;

  @ApiProperty({ example: 'ropamoda' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username solo puede contener letras minúsculas, números y guiones bajos',
  })
  username: string;

  @ApiProperty({ example: 'cm123abc456' })
  @IsString()
  categoryId: string;

  // AVATAR/LOGO (OPCIONAL)
  @ApiProperty({
    required: false,
    description: 'URL del logo cargado o null para generar avatar automático',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}