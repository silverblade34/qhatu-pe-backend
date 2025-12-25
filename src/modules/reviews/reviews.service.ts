import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Crear una reseña
   * Solo si el cliente tiene una orden CONFIRMED con el vendedor
   */
  async create(customerId: string, createReviewDto: CreateReviewDto) {
    const { sellerId, productId, rating, comment } = createReviewDto;

    // Validar que el rating esté entre 1 y 5
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5 estrellas');
    }

    // Verificar que el vendedor exista
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException('Vendedor no encontrado');
    }

    // Verificar que el cliente no se esté calificando a sí mismo
    if (customerId === sellerId) {
      throw new BadRequestException('No puedes calificarte a ti mismo');
    }

    // Si se especifica un producto, verificar que exista y pertenezca al vendedor
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (product.userId !== sellerId) {
        throw new BadRequestException('El producto no pertenece a este vendedor');
      }
    }

    // 🔒 VALIDACIÓN PRINCIPAL: Verificar que el cliente tenga una orden CONFIRMED con el vendedor
    const hasConfirmedOrder = await this.prisma.order.findFirst({
      where: {
        userId: sellerId, // Orden del vendedor
        status: OrderStatus.CONFIRMED, // Estado CONFIRMED
        // Verificar que el cliente sea quien hizo el pedido
        OR: [
          { customerEmail: { not: null } }, // Tiene email registrado
        ],
      },
      include: {
        items: productId
          ? {
              where: { productId }, // Si se especifica producto, verificar que esté en la orden
            }
          : undefined,
      },
    });

    if (!hasConfirmedOrder) {
      throw new ForbiddenException(
        'Solo puedes dejar una reseña si has comprado y tu pedido está confirmado',
      );
    }

    // Si se especifica un producto, verificar que esté en una orden confirmada
    if (productId && hasConfirmedOrder.items.length === 0) {
      throw new ForbiddenException(
        'Solo puedes reseñar productos que hayas comprado',
      );
    }

    // Verificar que el cliente no haya dejado ya una reseña para este vendedor/producto
    const existingReview = await this.prisma.review.findFirst({
      where: {
        customerId,
        sellerId,
        ...(productId && { productId }),
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        productId
          ? 'Ya has dejado una reseña para este producto'
          : 'Ya has dejado una reseña para este vendedor',
      );
    }

    // Crear la reseña
    const review = await this.prisma.review.create({
      data: {
        customerId,
        sellerId,
        productId,
        rating,
        comment,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true,
          },
        },
        product: productId
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : undefined,
      },
    });

    // 🔔 Notificar al vendedor
    await this.notificationsService.notifyNewReview(review.id);

    return review;
  }

  /**
   * Obtener todas las reseñas de un vendedor
   */
  async findBySellerById(sellerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { sellerId },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),

      this.prisma.review.count({
        where: { sellerId },
      }),
    ]);

    // Calcular estadísticas
    const stats = await this.getSellerRatingStats(sellerId);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  /**
   * Obtener reseñas de un producto específico
   */
  async findByProductId(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),

      this.prisma.review.count({
        where: { productId },
      }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener estadísticas de calificación de un vendedor
   */
  async getSellerRatingStats(sellerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { sellerId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    // Calcular distribución de estrellas
    const distribution = reviews.reduce(
      (acc, review) => {
        acc[review.rating]++;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    );

    // Calcular promedio
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = parseFloat((sum / reviews.length).toFixed(1));

    return {
      averageRating,
      totalReviews: reviews.length,
      distribution,
    };
  }

  /**
   * Actualizar una reseña (solo el cliente que la creó puede editarla)
   */
  async update(
    reviewId: string,
    customerId: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.customerId !== customerId) {
      throw new ForbiddenException('Solo puedes editar tus propias reseñas');
    }

    const { rating, comment } = updateReviewDto;

    if (rating && (rating < 1 || rating > 5)) {
      throw new BadRequestException('La calificación debe estar entre 1 y 5 estrellas');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Eliminar una reseña (solo el cliente que la creó puede eliminarla)
   */
  async remove(reviewId: string, customerId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    if (review.customerId !== customerId) {
      throw new ForbiddenException('Solo puedes eliminar tus propias reseñas');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return { message: 'Reseña eliminada correctamente' };
  }

  /**
   * Verificar si un cliente puede dejar reseña a un vendedor
   */
  async canReview(customerId: string, sellerId: string, productId?: string) {
    // Verificar que tenga una orden confirmada
    const hasConfirmedOrder = await this.prisma.order.findFirst({
      where: {
        userId: sellerId,
        status: OrderStatus.CONFIRMED,
      },
      include: {
        items: productId
          ? {
              where: { productId },
            }
          : undefined,
      },
    });

    if (!hasConfirmedOrder) {
      return {
        canReview: false,
        reason: 'No tienes pedidos confirmados con este vendedor',
      };
    }

    if (productId && hasConfirmedOrder.items.length === 0) {
      return {
        canReview: false,
        reason: 'No has comprado este producto',
      };
    }

    // Verificar si ya dejó una reseña
    const existingReview = await this.prisma.review.findFirst({
      where: {
        customerId,
        sellerId,
        ...(productId && { productId }),
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'Ya has dejado una reseña',
      };
    }

    return {
      canReview: true,
      reason: null,
    };
  }
}