import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateVariantDto } from '../dto/create-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Crea variantes heredando precios del producto principal si no se especifican
   */
  async createVariants(
    productId: string, 
    variants: CreateVariantDto[],
    productDefaults?: {
      price?: number;
      compareAtPrice?: number;
      cost?: number;
    }
  ) {
    const variantsData = variants.map((variant) => ({
      productId,
      name: variant.name,
      sku: variant.sku,
      // Hereda del producto principal si no se especifica
      price: variant.price ?? productDefaults?.price,
      compareAtPrice: variant.compareAtPrice ?? productDefaults?.compareAtPrice,
      cost: variant.cost ?? productDefaults?.cost,
      stock: variant.stock,
      attributes: variant.attributes,
      isActive: variant.isActive ?? true,
    }));

    // Crear las variantes
    await this.prisma.productVariant.createMany({
      data: variantsData,
    });

    // Calcular stock total sumando todas las variantes
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

    // Actualizar el stock del producto principal
    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    });

    return { 
      created: variantsData.length, 
      totalStock 
    };
  }

  async getVariantsByProduct(productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { name: 'asc' },
    });
  }

  async updateVariantStock(variantId: string, stock: number) {
    // Actualizar stock de la variante
    const updatedVariant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      include: { product: true },
    });

    // Recalcular el stock total del producto
    await this.recalculateProductStock(updatedVariant.productId);

    return updatedVariant;
  }

  /**
   * Recalcula el stock del producto sumando todas sus variantes
   */
  async recalculateProductStock(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      select: { stock: true },
    });

    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    });

    return totalStock;
  }

  /**
   * Eliminar una variante y recalcular stock
   */
  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });

    if (!variant) {
      throw new Error('Variante no encontrada');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    // Recalcular stock del producto
    await this.recalculateProductStock(variant.productId);
  }
}