import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

interface VariantDto {
  type: string; // 'SIZE' | 'COLOR'
  value: string;
  stock: number;
  priceModifier?: number;
}

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

  async createVariants(productId: string, variants: VariantDto[]) {
    const variantsData = variants.map((variant) => ({
      productId,
      type: variant.type,
      value: variant.value,
      stock: variant.stock,
      priceModifier: variant.priceModifier || 0,
    }));

    return this.prisma.productVariant.createMany({
      data: variantsData,
    });
  }

  async getVariantsByProduct(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { type: 'asc' },
    });
  }

  async updateVariantStock(variantId: string, stock: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
    });
  }
}