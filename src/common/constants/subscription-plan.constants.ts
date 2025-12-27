import { Plan } from '@prisma/client';

export type SubscriptionPlan = Plan;

export interface PlanFeatures {
  maxProducts: number;
  maxImagesPerProduct: number;
  maxImageSizeKB: number;
  imageQuality: number;
  imageMaxWidth: number;
  imageMaxHeight: number;
  maxActiveCoupons: number;
  canUseCoupons: boolean;
  canUseFlashSales: boolean;
  canExportOrders: boolean;
  canUseAnalytics: boolean;
  canUseCustomDomain: boolean;
  hasWatermark: boolean;
  maxOrdersPerMonth: number;
  monthlyPrice: number;
  annualPrice: number;
}

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  BASIC: {
    maxProducts: 15,
    maxImagesPerProduct: 3,
    maxImageSizeKB: 200,
    imageQuality: 75,
    imageMaxWidth: 1200,
    imageMaxHeight: 1200,
    maxActiveCoupons: 1,
    canUseCoupons: true,
    canUseFlashSales: false,
    canExportOrders: false,
    canUseAnalytics: false,
    canUseCustomDomain: false,
    hasWatermark: true,
    maxOrdersPerMonth: 100,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  PRO: {
    maxProducts: 100,
    maxImagesPerProduct: 5,
    maxImageSizeKB: 300,
    imageQuality: 82,
    imageMaxWidth: 1600,
    imageMaxHeight: 1600,
    maxActiveCoupons: 5,
    canUseCoupons: true,
    canUseFlashSales: true,
    canExportOrders: true,
    canUseAnalytics: true,
    canUseCustomDomain: false,
    hasWatermark: false,
    maxOrdersPerMonth: 500,
    monthlyPrice: 49,
    annualPrice: 490,
  },
  PREMIUM: {
    maxProducts: Infinity,
    maxImagesPerProduct: 10,
    maxImageSizeKB: 500,
    imageQuality: 88,
    imageMaxWidth: 2000,
    imageMaxHeight: 2000,
    maxActiveCoupons: Infinity,
    canUseCoupons: true,
    canUseFlashSales: true,
    canExportOrders: true,
    canUseAnalytics: true,
    canUseCustomDomain: true,
    hasWatermark: false,
    maxOrdersPerMonth: Infinity,
    monthlyPrice: 99,
    annualPrice: 990,
  },
};

export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  BASIC: 1,
  PRO: 2,
  PREMIUM: 3,
};