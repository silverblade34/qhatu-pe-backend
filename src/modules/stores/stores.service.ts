import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface SearchStoresParams {
  query?: string;
  category?: string;
  verified?: boolean;
  hasOffers?: boolean;
  sort?: 'rating' | 'products' | 'newest';
  page: number;
  limit: number;
}

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) { }

  async searchStores(params: SearchStoresParams) {
    const { query, category, verified, hasOffers, sort, page, limit } = params;
    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const where: any = {
      storeProfile: {
        isActive: true,
      },
    };

    // Filtro por búsqueda de texto
    if (query) {
      where.OR = [
        { username: { contains: query, mode: 'insensitive' } },
        { fullName: { contains: query, mode: 'insensitive' } },
        { storeProfile: { storeName: { contains: query, mode: 'insensitive' } } },
        { storeProfile: { bio: { contains: query, mode: 'insensitive' } } },
      ];
    }

    // Filtro por verificación
    if (verified) {
      where.isVerified = true;
    }

    // Filtro por categoría
    if (category) {
      where.products = {
        some: {
          category: {
            slug: category,
          },
        },
      };
    }

    // Filtro por ofertas (tiendas con cupones activos)
    if (hasOffers) {
      where.coupons = {
        some: {
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
      };
    }

    // Obtener tiendas con sus datos
    const [stores, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          fullName: true,
          isVerified: true,
          createdAt: true,
          storeProfile: {
            select: {
              storeName: true,
              bio: true,
              logo: true,
              category: {
                select: {
                  id: true,
                  name: true,
                }
              },
              banner: true,
              badges: true,
            },
          },
          products: {
            where: { isActive: true },
            select: { id: true },
          },
          reviews: {
            select: { rating: true },
          },
          coupons: {
            where: {
              status: 'ACTIVE',
              endDate: { gte: new Date() },
            },
            select: { id: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Calcular rating y formatear respuesta
    const formattedStores = stores.map(store => {
      const avgRating =
        store.reviews.length > 0
          ? store.reviews.reduce((acc, r) => acc + r.rating, 0) / store.reviews.length
          : 0;

      return {
        id: store.id,
        username: store.username,
        storeName: store.storeProfile.storeName,
        bio: store.storeProfile.bio,
        logo: store.storeProfile.logo,
        banner: store.storeProfile.banner,
        category: store.storeProfile.category,
        isVerified: store.isVerified,
        badges: store.storeProfile.badges,
        rating: {
          average: Math.round(avgRating * 10) / 10,
          count: store.reviews.length,
        },
        stats: {
          totalProducts: store.products.length,
          hasOffers: store.coupons.length > 0,
        },
        url: `https://qhatupe.com/${store.username}`,
      };
    });

    if (sort === 'rating') {
      formattedStores.sort((a, b) => b.rating.average - a.rating.average);
    } else if (sort === 'products') {
      formattedStores.sort((a, b) => b.stats.totalProducts - a.stats.totalProducts);
    } else if (sort === 'newest') {
      // Ya viene ordenado por createdAt desde la query
    }

    return {
      stores: formattedStores,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStoreByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        fullName: true,
        isVerified: true,
        createdAt: true,
        storeProfile: {
          include: {
            socialLinks: true,
          },
        },
        products: {
          where: { isActive: true },
          include: {
            images: {
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
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            customer: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        coupons: {
          where: {
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            minPurchase: true,
            endDate: true,
          },
        },
      },
    });

    if (!user || !user.storeProfile?.isActive) {
      throw new NotFoundException('Tienda no encontrada o no está activa');
    }

    const avgRating =
      user.reviews.length > 0
        ? user.reviews.reduce((acc, r) => acc + r.rating, 0) / user.reviews.length
        : 0;

    return {
      id: user.id,
      username: user.username,
      storeName: user.storeProfile.storeName,
      bio: user.storeProfile.bio,
      logo: user.storeProfile.logo,
      banner: user.storeProfile.banner,
      phone: user.storeProfile.phone,
      isVerified: user.isVerified,
      badges: user.storeProfile.badges,
      socialLinks: user.storeProfile.socialLinks,
      memberSince: user.createdAt,
      rating: {
        average: Math.round(avgRating * 10) / 10,
        count: user.reviews.length,
      },
      stats: {
        totalProducts: user.products.length,
        activeCoupons: user.coupons.length,
      },
      products: user.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        slug: p.slug,
        image: p.images[0]?.url,
        category: p.category,
      })),
      recentReviews: user.reviews,
      activeCoupons: user.coupons,
    };
  }

  async getFeaturedStores(limit: number) {
    const stores = await this.prisma.user.findMany({
      where: {
        isVerified: true,
        storeProfile: {
          isActive: true,
        },
      },
      take: limit,
      select: {
        id: true,
        username: true,
        storeProfile: {
          select: {
            storeName: true,
            logo: true,
            badges: true,
          },
        },
        products: {
          where: { isActive: true },
          select: { id: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return stores.map(store => {
      const avgRating =
        store.reviews.length > 0
          ? store.reviews.reduce((acc, r) => acc + r.rating, 0) / store.reviews.length
          : 0;

      return {
        username: store.username,
        storeName: store.storeProfile.storeName,
        logo: store.storeProfile.logo,
        badges: store.storeProfile.badges,
        rating: Math.round(avgRating * 10) / 10,
        totalProducts: store.products.length,
        url: `https://qhatupe.com/${store.username}`,
      };
    });
  }

  async getStoresByCategory(categoryId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // Verificar que la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Obtener tiendas que tienen esta categoría
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          storeProfile: {
            categoryId: category.id,
            isActive: true,
          },
        },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          isVerified: true,
          storeProfile: {
            select: {
              storeName: true,
              logo: true,
              badges: true,
            },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          storeProfile: {
            categoryId: category.id,
            isActive: true,
          },
        },
      }),
    ]);

    const stores = users.map(user => {
      const avgRating =
        user.reviews.length > 0
          ? user.reviews.reduce((acc, r) => acc + r.rating, 0) / user.reviews.length
          : 0;

      return {
        username: user.username,
        storeName: user.storeProfile.storeName,
        logo: user.storeProfile.logo,
        isVerified: user.isVerified,
        badges: user.storeProfile.badges,
        rating: Math.round(avgRating * 10) / 10,
        url: `https://qhatupe.com/${user.username}`,
      };
    });

    return {
      category: {
        name: category.name,
      },
      stores,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}