import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserVerificationService } from './services/user-verification.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileService,
    UserVerificationService,
  ],
  exports: [UsersService],
})
export class UsersModule {}