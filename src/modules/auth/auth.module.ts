import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { DatabaseModule } from 'src/database/database.module';
import { AvatarService } from '../avatar/avatar.service';
import { MailModule } from '../mail/mail.module';
import { PasswordResetService } from './services/password-reset.service';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    ConfigModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: config.get('jwt.accessTokenExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,
    LocalStrategy, AvatarService, PasswordResetService],
  exports: [AuthService, JwtModule],
})
export class AuthModule { }