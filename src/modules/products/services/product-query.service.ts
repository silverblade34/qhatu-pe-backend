import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AvailabilityFilter, FilterProductSellerDto } from '../dto/filter-product-seller.dto';
import { LiveEventStatus } from '@prisma/client';
import { FilterProductDto, PriceRange, SortOption } from '../dto/filter-product-customer.dto';

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

    // Obtener el live activo y sus productos destacados
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

    // Calcular paginación
    const limit = filters.limit || 20;
    const page = filters.page || 1;
    const offset = filters.offset ?? (page - 1) * limit;

    // Construir WHERE clause con filtros avanzados
    const where = this.buildAdvancedWhereClause(user.id, filters);

    // Determinar ordenamiento
    const orderBy = this.buildOrderByClause(filters.sortBy || SortOption.FEATURED);

    // Ejecutar consultas en paralelo
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
          // Agregar rating si tienes reviews
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Procesar productos y agregar campos calculados
    const processedProducts = products.map((product) => {
      const isLiveFeatured = liveProductIds.has(product.id);
      const isPinned = activeLive?.pinnedProductId === product.id;

      // Calcular rating promedio
      const ratings = product.reviews.map((r) => r.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      return {
        ...product,
        isLiveFeatured,
        isPinnedInLive: isPinned,
        hasDiscount: product.compareAtPrice
          ? product.compareAtPrice > product.price
          : false,
        salePrice: product.compareAtPrice && product.compareAtPrice > product.price
          ? product.price
          : null,
        rating: {
          average: averageRating,
          count: ratings.length,
        },
        reviews: undefined, // Remover reviews del response
      };
    });

    // Re-ordenar solo si es sortBy "featured" (para priorizar live)
    let sortedProducts = processedProducts;
    if (filters.sortBy === SortOption.FEATURED || !filters.sortBy) {
      sortedProducts = this.applyLivePriority(processedProducts);
    }

    return {
      data: sortedProducts,
      total,
      limit,
      offset,
      page,
      totalPages: Math.ceil(total / limit),
      hasActiveLive: !!activeLive,
    };
  }

  /**
   * Construir WHERE clause con todos los filtros avanzados
   */
  private buildAdvancedWhereClause(userId: string, filters: FilterProductDto) {
    const where: any = {
      userId,
      isActive: true,
    };

    // Búsqueda por nombre
    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    // Filtro por categoría
    if (filters.categorySlug) {
      where.category = {
        slug: filters.categorySlug,
      };
    }

    // Solo productos con descuento (Flash Sale)
    if (filters.onlyDiscount) {
      where.isFlashSale = true;
    }

    // Solo productos en stock
    if (filters.onlyInStock) {
      where.stock = {
        gt: 0,
      };
    }

    // Rango de precio predefinido
    if (filters.priceRange) {
      const priceCondition = this.getPriceRangeCondition(filters.priceRange);
      where.price = priceCondition;
    }

    // Rango de precio personalizado (tiene prioridad sobre priceRange)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      };
    }

    return where;
  }

  /**
   * Convertir enum PriceRange a condición Prisma
   */
  private getPriceRangeCondition(range: PriceRange) {
    switch (range) {
      case PriceRange.UNDER_50:
        return { lt: 50 };
      case PriceRange.RANGE_50_100:
        return { gte: 50, lte: 100 };
      case PriceRange.RANGE_100_200:
        return { gte: 100, lte: 200 };
      case PriceRange.OVER_200:
        return { gt: 200 };
      default:
        return undefined;
    }
  }

  /**
   * Construir ORDER BY según opción de sorting
   */
  private buildOrderByClause(sortBy: SortOption) {
    switch (sortBy) {
      case SortOption.PRICE_ASC:
        return [{ price: 'asc' as const }];

      case SortOption.PRICE_DESC:
        return [{ price: 'desc' as const }];

      case SortOption.NEWEST:
        return [{ createdAt: 'desc' as const }];

      case SortOption.POPULAR:
        // Ordenar por número de reviews (requiere agregar count)
        return [
          { reviews: { _count: 'desc' as const } },
          { createdAt: 'desc' as const },
        ];

      case SortOption.FEATURED:
      default:
        // Orden por defecto: destacados > flash > nuevos > recientes
        return [
          { isFeatured: 'desc' as const },
          { isFlashSale: 'desc' as const },
          { isNewArrival: 'desc' as const },
          { createdAt: 'desc' as const },
        ];
    }
  }

  /**
   * Aplicar prioridad de live (solo para sort "featured")
   */
  private applyLivePriority(products: any[]) {
    return products.sort((a, b) => {
      // 1° Producto pinneado (mostrado AHORA en live)
      if (a.isPinnedInLive !== b.isPinnedInLive) {
        return a.isPinnedInLive ? -1 : 1;
      }

      // 2° Destacados en live
      if (a.isLiveFeatured !== b.isLiveFeatured) {
        return a.isLiveFeatured ? -1 : 1;
      }

      // 3° Destacados generales
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }

      // 4° Flash sales
      if (a.isFlashSale !== b.isFlashSale) {
        return a.isFlashSale ? -1 : 1;
      }

      // 5° Nuevos ingresos
      if (a.isNewArrival !== b.isNewArrival) {
        return a.isNewArrival ? -1 : 1;
      }

      // 6° Más recientes
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getSellerProducts(userId: string, filters: FilterProductSellerDto) {
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
    filters: FilterProductSellerDto,
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