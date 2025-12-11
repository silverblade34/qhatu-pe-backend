import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ProductStockService {
  constructor(private prisma: PrismaService) {}

  async decreaseStock(productId: string, quantity: number, variantId?: string) {
    if (variantId) {
      // Reducir stock de variante
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.stock < quantity) {
        throw new BadRequestException('Stock insuficiente');
      }

      return this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: { decrement: quantity } },
      });
    } else {
      // Reducir stock del producto
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.stock < quantity) {
        throw new BadRequestException('Stock insuficiente');
      }

      return this.prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
    }
  }

  async increaseStock(productId: string, quantity: number, variantId?: string) {
    if (variantId) {
      return this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
      });
    } else {
      return this.prisma.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
    }
  }

  async checkStock(productId: string, quantity: number, variantId?: string): Promise<boolean> {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      return variant ? variant.stock >= quantity : false;
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      return product ? product.stock >= quantity : false;
    }
  }
}