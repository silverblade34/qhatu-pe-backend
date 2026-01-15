import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { StoresModule } from './modules/stores/stores.module';
import { AvatarModule } from './modules/avatar/avatar.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { UploadModule } from './modules/upload/upload.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { MailModule } from './modules/mail/mail.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import awsConfig from './config/aws.config';
import emailConfig from './config/email.config';
import { ScheduleModule } from '@nestjs/schedule';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import r2Config from './config/r2.config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisConfig } from './config/redis.config';
import { RedisModule } from './modules/redis/redis.module';
import { BillingModule } from './modules/billing/billing.module';
import { VercelModule } from './modules/vercel/vercel.module';
import googleAuthConfig from './config/google-auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, awsConfig, emailConfig, r2Config, googleAuthConfig],
      envFilePath: '.env',
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: redisConfig,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    StoresModule,
    AvatarModule,
    ProductCategoriesModule,
    UploadModule,
    OrdersModule,
    CouponsModule,
    MailModule,
    DashboardModule,
    NotificationsModule,
    ReviewsModule,
    SubscriptionModule,
    RedisModule,
    BillingModule,
    VercelModule,
  ],
})
export class AppModule { }