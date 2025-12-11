import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'cliente@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'María González', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'mariag', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/)
  username?: string;

  // AVATAR/LOGO (OPCIONAL)
  @ApiProperty({
    required: false,
    description: 'URL del logo cargado o null para generar avatar automático',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
