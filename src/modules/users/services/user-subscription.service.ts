import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class UserSubscriptionService {
  constructor(private prisma: PrismaService) {}

  async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    return this.checkPlanPermissions(user.plan, feature);
  }

  private checkPlanPermissions(plan: Plan, feature: string): boolean {
    const permissions = {
      BASIC: {
        maxProducts: 50,
        maxImages: 3,
        canUseCoupons: true,
        canUseFlashSales: false,
        canExportOrders: false,
        canUseAnalytics: false,
      },
      PRO: {
        maxProducts: 200,
        maxImages: 5,
        canUseCoupons: true,
        canUseFlashSales: true,
        canExportOrders: true,
        canUseAnalytics: true,
      },
      PREMIUM: {
        maxProducts: Infinity,
        maxImages: 10,
        canUseCoupons: true,
        canUseFlashSales: true,
        canExportOrders: true,
        canUseAnalytics: true,
      },
    };

    const planPermissions = permissions[plan];
    return planPermissions[feature] || false;
  }

  async getProductLimit(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const limits = {
      BASIC: 50,
      PRO: 200,
      PREMIUM: Infinity,
    };

    return limits[user.plan];
  }

  async getCurrentProductCount(userId: string): Promise<number> {
    return this.prisma.product.count({
      where: { userId },
    });
  }
}