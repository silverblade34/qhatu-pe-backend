import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { FilterProductDto, AvailabilityFilter } from '../dto/filter-product.dto';
import { LiveEventStatus } from '@prisma/client';

@Injectable()
export class ProductQueryService {
  constructor(private prisma: PrismaService) { }

  async getProductById(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este producto');
    }

    return product;
  }

  async getProductBySlug(username: string, slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        userId: user.id,
        slug,
        isActive: true,
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: true,
        reviews: {
          include: {
            customer: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Calcular rating promedio
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((acc, r) => acc + r.rating, 0) /
        product.reviews.length
        : 0;

    return {
      ...product,
      rating: {
        average: Math.round(avgRating * 10) / 10,
        count: product.reviews.length,
      },
    };
  }

  async getPublicProducts(username: string, filters: FilterProductDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    // Obtener el live activo y sus productos destacados en UNA consulta
    const activeLive = await this.prisma.liveEvent.findFirst({
      where: {
        userId: user.id,
        status: LiveEventStatus.LIVE, 
      },
      select: {
        featuredProductIds: true,
        pinnedProductId: true,
      },
    });

    const liveProductIds = new Set(activeLive?.featuredProductIds || []);
    const where = this.buildWhereClause(user.id, filters, true);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          price: true,
          stock: true,
          compareAtPrice: true,
          tags: true,
          isFlashSale: true,
          isFeatured: true,
          isComingSoon: true,
          isNewArrival: true,
          lowStockThreshold: true,
          createdAt: true,
          images: {
            select: {
              url: true,
              altText: true,
            },
            orderBy: { order: 'asc' },
            take: 1,
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        // Ordenamiento optimizado por prioridad
        orderBy: [
          { isFeatured: 'desc' },    // 1° Destacados generales
          { isFlashSale: 'desc' },   // 2° Flash sales
          { createdAt: 'desc' },     // 3° Más recientes
        ],
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Procesar productos y agregar campos calculados
    const processedProducts = products.map(product => {
      const isLiveFeatured = liveProductIds.has(product.id);
      const isPinned = activeLive?.pinnedProductId === product.id;

      return {
        ...product,
        isLiveFeatured,      // Destacado en live activo
        isPinnedInLive: isPinned, // Producto que se muestra AHORA
        hasDiscount: product.compareAtPrice
          ? product.compareAtPrice > product.price
          : false,
      };
    });

    // Reordenar: Live featured primero, luego el resto
    const sortedProducts = processedProducts.sort((a, b) => {
      // 1° Producto pinneado (mostrado ahora)
      if (a.isPinnedInLive !== b.isPinnedInLive) {
        return a.isPinnedInLive ? -1 : 1;
      }
      // 2° Destacados en live
      if (a.isLiveFeatured !== b.isLiveFeatured) {
        return a.isLiveFeatured ? -1 : 1;
      }
      // 3° Destacados generales (ya viene ordenado de la DB)
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      // 4° Flash sales
      if (a.isFlashSale !== b.isFlashSale) {
        return a.isFlashSale ? -1 : 1;
      }
      // 5° Mantener orden por fecha (más recientes primero)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      data: sortedProducts,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      hasActiveLive: !!activeLive,
    };
  }

  async getSellerProducts(userId: string, filters: FilterProductDto) {
    const where = this.buildWhereClause(userId, filters, false);

    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });

    const total = await this.prisma.product.count({ where });

    return {
      data: products,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getLowStockProducts(userId: string) {
    return this.prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { stock: { lte: this.prisma.product.fields.lowStockThreshold } },
          {
            variants: {
              some: {
                stock: { lte: 5 },
              },
            },
          },
        ],
      },
      include: {
        images: { take: 1 },
        variants: {
          where: { stock: { lte: 5 } },
        },
      },
    });
  }

  private buildWhereClause(
    userId: string,
    filters: FilterProductDto,
    isPublic: boolean,
  ): any {
    const where: any = { userId };

    if (isPublic) {
      where.isActive = true;
    }

    // Filtros
    if (filters.category && filters.category !== 'ALL') {
      where.categoryId = filters.category;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.availability === AvailabilityFilter.AVAILABLE) {
      where.stock = { gt: 0 };
    } else if (filters.availability === AvailabilityFilter.OUT_OF_STOCK) {
      where.stock = 0;
    } else if (filters.availability === AvailabilityFilter.FLASH_SALE) {
      where.isFlashSale = true;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {
        ...(filters.minPrice && { gte: filters.minPrice }),
        ...(filters.maxPrice && { lte: filters.maxPrice }),
      };
    }

    return where;
  }
}