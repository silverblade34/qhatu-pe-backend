import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SubscriptionService } from '../../subscription/subscription.service';

@Injectable()
export class ProductValidationService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) { }

  async validateResourceLimits(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    const productCount = await this.prisma.product.count({
      where: { userId },
    });

    try {
     await this.subscriptionService.validateResourceLimit(
        user.plan,
        'products',
        productCount,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async validateUniqueProductName(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        userId,
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    if (existingProduct) {
      throw new BadRequestException(
        `Ya tienes un producto con el nombre "${name}". Por favor, usa un nombre diferente.`,
      );
    }
  }

  async validateCategory(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.userId !== userId) {
      throw new BadRequestException('Categoría no válida');
    }
  }

  async validateImageLimit(
    userId: string,
    imageCount: number,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    try {
     await this.subscriptionService.validateImageUpload(user.plan, imageCount);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}