// prisma/seeders/seed-plan-configs.ts
import { PrismaClient, Plan } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPlanConfigs() {
  console.log('🌱 Seeding plan configurations...');

  const plans = [
    {
      plan: Plan.BASIC,
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxProducts: 15,
      maxImagesPerProduct: 1,
      maxImageSizeKB: 200,
      imageQuality: 75,
      imageMaxWidth: 1200,
      imageMaxHeight: 1200,
      maxActiveCoupons: 1,
      canUseCoupons: true,
      maxBanners: 1,
      maxOffers: 0,
      maxCampaigns: 0,
      maxCategories: 3,
      canUseFlashSales: false,
      canExportOrders: false,
      canUseAnalytics: false,
      canUseCustomDomain: false,
      hasWatermark: true,
      maxOrdersPerMonth: 100,
      gracePeriodDays: 2,
      isActive: true,
    },
    {
      plan: Plan.PRO,
      monthlyPrice: 29,
      yearlyPrice: 290,
      maxProducts: 100,
      maxImagesPerProduct: 5,
      maxImageSizeKB: 300,
      imageQuality: 82,
      imageMaxWidth: 1600,
      imageMaxHeight: 1600,
      maxActiveCoupons: 5,
      canUseCoupons: true,
      maxBanners: 5,
      maxOffers: 3,
      maxCampaigns: 2,
      maxCategories: 10,
      canUseFlashSales: true,
      canExportOrders: true,
      canUseAnalytics: true,
      canUseCustomDomain: false,
      hasWatermark: false,
      maxOrdersPerMonth: 500,
      gracePeriodDays: 2,
      isActive: true,
    },
    {
      plan: Plan.PREMIUM,
      monthlyPrice: 49,
      yearlyPrice: 490,
      maxProducts: 999999,
      maxImagesPerProduct: 10,
      maxImageSizeKB: 500,
      imageQuality: 88,
      imageMaxWidth: 2000,
      imageMaxHeight: 2000,
      maxActiveCoupons: 999999,
      canUseCoupons: true,
      maxBanners: 20,
      maxOffers: 10,
      maxCampaigns: 5,
      maxCategories: 999999,
      canUseFlashSales: true,
      canExportOrders: true,
      canUseAnalytics: true,
      canUseCustomDomain: true,
      hasWatermark: false,
      maxOrdersPerMonth: 999999,
      gracePeriodDays: 3,
      isActive: true,
    },
  ];

  for (const planConfig of plans) {
    await prisma.planConfig.upsert({
      where: { plan: planConfig.plan },
      update: planConfig,
      create: planConfig,
    });
    console.log(`✅ Plan ${planConfig.plan} configured`);
  }

  console.log(`✅ Created/Updated ${plans.length} plan configurations`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedPlanConfigs()
    .catch((e) => {
      console.error('❌ Plan config seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}