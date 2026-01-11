import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener configuración de un plan desde la BD
   */
  async getPlanConfig(plan: Plan) {
    const config = await this.prisma.planConfig.findUnique({
      where: { plan },
    });

    if (!config) {
      throw new NotFoundException(`Configuración para plan ${plan} no encontrada`);
    }

    return config;
  }

  /**
   * Validar límite de un recurso
   */
  async validateResourceLimit(
    plan: Plan,
    resourceType: 'products' | 'coupons' | 'banners' | 'offers' | 'campaigns' | 'categories',
    currentCount: number,
  ): Promise<void> {
    const config = await this.getPlanConfig(plan);

    const limitMap = {
      products: config.maxProducts,
      coupons: config.maxActiveCoupons,
      banners: config.maxBanners,
      offers: config.maxOffers,
      campaigns: config.maxCampaigns,
      categories: config.maxCategories,
    };

    const limit = limitMap[resourceType];

    if (currentCount >= limit) {
      const nextPlan = this.getNextPlan(plan);
      throw new BadRequestException(
        `Has alcanzado el límite de ${limit} ${resourceType} en tu plan ${plan}.${
          nextPlan ? ` Actualiza a ${nextPlan} para continuar.` : ''
        }`,
      );
    }
  }

  /**
   * Validar funcionalidad específica
   */
  async validateFeature(plan: Plan, feature: 'flashSales' | 'analytics' | 'customDomain' | 'exportOrders'): Promise<void> {
    const config = await this.getPlanConfig(plan);

    const featureMap = {
      flashSales: config.canUseFlashSales,
      analytics: config.canUseAnalytics,
      customDomain: config.canUseCustomDomain,
      exportOrders: config.canExportOrders,
    };

    if (!featureMap[feature]) {
      const nextPlan = this.getNextPlan(plan);
      throw new BadRequestException(
        `Esta funcionalidad requiere plan ${nextPlan || 'superior'}. Tu plan actual: ${plan}.`,
      );
    }
  }

  /**
   * Validar subida de imágenes
   */
  async validateImageUpload(plan: Plan, fileCount: number): Promise<void> {
    const config = await this.getPlanConfig(plan);

    if (fileCount > config.maxImagesPerProduct) {
      throw new BadRequestException(
        `Tu plan ${plan} permite máximo ${config.maxImagesPerProduct} imágenes por producto.`,
      );
    }
  }

  /**
   * Obtener siguiente plan
   */
  private getNextPlan(currentPlan: Plan): Plan | null {
    const plans: Plan[] = ['BASIC', 'PRO', 'PREMIUM'];
    const currentIndex = plans.indexOf(currentPlan);
    return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : null;
  }

  /**
   * Comparar planes
   */
  isPlanHigherThan(plan1: Plan, plan2: Plan): boolean {
    const hierarchy = { BASIC: 1, PRO: 2, PREMIUM: 3 };
    return hierarchy[plan1] > hierarchy[plan2];
  }
}