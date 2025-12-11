import { IsEmail, IsString, MinLength, MaxLength, Matches, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // DATOS PERSONALES
  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  @MinLength(2, { message: 'Nombre completo debe tener mínimo 2 caracteres' })
  @MaxLength(100, { message: 'Nombre completo debe tener máximo 100 caracteres' })
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
  @MinLength(8, { message: 'Contraseña debe tener mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  password: string;

  // DATOS DE LA TIENDA
  @ApiProperty({ example: 'Ropa Moda Perú' })
  @IsString()
  @MinLength(3, { message: 'Nombre de tienda debe tener mínimo 3 caracteres' })
  @MaxLength(50, { message: 'Nombre de tienda debe tener máximo 50 caracteres' })
  storeName: string;

  @ApiProperty({ 
    example: 'ropamoda',
    description: 'URL única de la tienda (ej: qhatu.pe/ropamoda)'
  })
  @IsString()
  @MinLength(3, { message: 'Username debe tener mínimo 3 caracteres' })
  @MaxLength(30, { message: 'Username debe tener máximo 30 caracteres' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Username solo puede contener letras minúsculas, números y guiones bajos',
  })
  username: string;

  @ApiProperty({ 
    example: 'cm123abc456',
    description: 'ID de la categoría seleccionada'
  })
  @IsString()
  @IsNotEmpty({ message: 'Debes seleccionar una categoría' })
  categoryId: string;

  // AVATAR (opcional - generado con DiceBear)
  @ApiProperty({ 
    example: 'https://api.dicebear.com/7.x/initials/svg?seed=JuanPerez',
    required: false,
    description: 'URL del avatar generado (opcional)'
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}