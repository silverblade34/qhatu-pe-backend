import { Injectable, BadRequestException } from '@nestjs/common';
import {
  SubscriptionPlan,
  PLAN_FEATURES,
  PLAN_HIERARCHY,
} from 'src/common/constants/subscription-plan.constants';

@Injectable()
export class SubscriptionService {
  /**
   * Obtiene las características de un plan
   */
  getPlanFeatures(plan: SubscriptionPlan) {
    return PLAN_FEATURES[plan];
  }

  /**
   * Verifica si el usuario ha alcanzado el límite de un recurso
   */
  validateResourceLimit(
    plan: SubscriptionPlan,
    resource: keyof typeof PLAN_FEATURES.BASIC,
    currentCount: number,
  ): void {
    const limit = PLAN_FEATURES[plan][resource] as number;
    
    if (currentCount >= limit) {
      const nextPlan = this.getNextPlan(plan);
      throw new BadRequestException(
        `Has alcanzado el límite de ${limit} ${resource} en tu plan ${plan}. ${
          nextPlan ? `Actualiza a ${nextPlan} para continuar.` : ''
        }`,
      );
    }
  }

  /**
   * Valida múltiples archivos según plan
   */
  validateFileUpload(
    plan: SubscriptionPlan,
    fileCount: number,
  ): void {
    const maxFiles = PLAN_FEATURES[plan].maxImagesPerProduct;

    if (fileCount > maxFiles) {
      throw new BadRequestException(
        `Tu plan ${plan} permite máximo ${maxFiles} imágenes. Actualiza para subir más.`,
      );
    }
  }

  /**
   * Obtiene el siguiente plan disponible
   */
  getNextPlan(currentPlan: SubscriptionPlan): SubscriptionPlan | null {
    const plans: SubscriptionPlan[] = ['BASIC', 'PRO', 'PREMIUM'];
    const currentIndex = plans.indexOf(currentPlan);
    return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : null;
  }

  /**
   * Verifica si un plan es superior a otro
   */
  isPlanHigherThan(plan1: SubscriptionPlan, plan2: SubscriptionPlan): boolean {
    return PLAN_HIERARCHY[plan1] > PLAN_HIERARCHY[plan2];
  }

  /**
   * Calcula el ahorro anual
   */
  getAnnualSavings(plan: SubscriptionPlan): number {
    const features = this.getPlanFeatures(plan);
    const monthlyTotal = features.monthlyPrice * 12;
    return monthlyTotal - features.annualPrice;
  }
}