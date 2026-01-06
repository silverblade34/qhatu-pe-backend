import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleRegisterDto {
  @ApiProperty({
    description: 'Token de ID de Google (JWT)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjMwM...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({
    description: 'Rol del usuario (opcional, por defecto CUSTOMER)',
    example: 'SELLER',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: 'SELLER' | 'CUSTOMER';
}