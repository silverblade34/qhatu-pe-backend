import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ProductSearchService {
  constructor(private prisma: PrismaService) {}

  async searchProducts(userId: string, query: string) {
    return this.prisma.product.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        images: { take: 1 },
      },
      take: 10,
    });
  }
}