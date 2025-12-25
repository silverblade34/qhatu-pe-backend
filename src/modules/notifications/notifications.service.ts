import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsGateway, NotificationType } from './notifications.gateway';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Cron job que se ejecuta cada hora para revisar cupones por expirar
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiringCoupons() {
    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = new Date();

    const expiringCoupons = await this.prisma.coupon.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        user: true,
      },
    });

    for (const coupon of expiringCoupons) {
      const hoursLeft = Math.floor(
        (coupon.endDate.getTime() - now.getTime()) / (1000 * 60 * 60),
      );
      
      this.notificationsGateway.notifyCouponExpiring(
        coupon.userId,
        coupon,
        hoursLeft,
      );
    }
  }

  /**
   * Cron job que revisa cupones que acaban de activarse
   * Se ejecuta cada 15 minutos
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkStartingCoupons() {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const startingCoupons = await this.prisma.coupon.findMany({
      where: {
        status: 'ACTIVE',
        startDate: {
          gte: fifteenMinutesAgo,
          lte: now,
        },
      },
    });

    for (const coupon of startingCoupons) {
      this.notificationsGateway.notifyCouponStarted(coupon.userId, coupon);
    }
  }

  /**
   * Cron job que revisa productos con stock bajo
   * Se ejecuta cada 30 minutos
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkLowStock() {
    // Encontrar productos con stock bajo que aún no han sido notificados hoy
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          lte: this.prisma.product.fields.lowStockThreshold,
          gt: 0, // Mayor que 0 (no agotado completamente)
        },
      },
      include: {
        user: true,
      },
    });

    for (const product of products) {
      // Solo notificar si el usuario está conectado
      if (this.notificationsGateway.isUserConnected(product.userId)) {
        this.notificationsGateway.notifyLowStock(product.userId, product);
      }
    }
  }

  /**
   * Notifica cuando un producto se agota completamente
   */
  async notifyProductOutOfStock(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (product && product.stock === 0) {
      this.notificationsGateway.notifyOutOfStock(product.userId, product);
    }
  }

  /**
   * Notifica cuando llega un nuevo pedido
   * Se llama desde el OrdersService al crear un pedido
   */
  async notifyNewOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (order) {
      this.notificationsGateway.notifyNewOrder(order.userId, order);

      // Verificar si algún producto quedó con stock bajo
      for (const item of order.items) {
        if (
          item.product.stock <= item.product.lowStockThreshold &&
          item.product.stock > 0
        ) {
          this.notificationsGateway.notifyLowStock(order.userId, item.product);
        } else if (item.product.stock === 0) {
          this.notificationsGateway.notifyOutOfStock(order.userId, item.product);
        }
      }
    }
  }

  /**
   * Notifica cuando llega una nueva reseña
   */
  async notifyNewReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        customer: true,
        seller: true,
      },
    });

    if (review) {
      this.notificationsGateway.notifyNewReview(review.sellerId, review);
    }
  }

  /**
   * Obtiene el conteo de notificaciones importantes
   */
  async getNotificationCount(userId: string) {
    const [pendingOrders, lowStockCount, expiringCoupons] = await Promise.all([
      this.prisma.order.count({
        where: {
          userId,
          status: OrderStatus.PENDING,
        },
      }),

      this.prisma.product.count({
        where: {
          userId,
          isActive: true,
          stock: {
            lte: 5, // Umbral de stock bajo
          },
        },
      }),

      this.prisma.coupon.count({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      pendingOrders,
      lowStockCount,
      expiringCoupons,
      total: pendingOrders + lowStockCount + expiringCoupons,
    };
  }
}