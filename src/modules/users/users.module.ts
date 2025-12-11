import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserProfileService } from './services/user-profile.service';
import { UserSubscriptionService } from './services/user-subscription.service';
import { UserVerificationService } from './services/user-verification.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserProfileService,
    UserSubscriptionService,
    UserVerificationService,
  ],
  exports: [UsersService],
})
export class UsersModule {}