import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 're***..' })
  @IsString()
  token: string;

    @ApiProperty({ example: 'password' })
  @IsString()
  newPassword: string;
}