import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateVariantDto } from '../dto/create-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) { }

  async createVariants(productId: string, variants: CreateVariantDto[]) {
    const variantsData = variants.map((variant) => ({
      productId,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      attributes: variant.attributes,
      isActive: true,
    }));

    return this.prisma.productVariant.createMany({
      data: variantsData,
    });
  }

  async getVariantsByProduct(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { name: 'asc' },
    });
  }

  async updateVariantStock(variantId: string, stock: number) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
    });
  }
}