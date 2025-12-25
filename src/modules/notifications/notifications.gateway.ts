import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

export enum NotificationType {
  NEW_ORDER = 'NEW_ORDER',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  LOW_STOCK = 'LOW_STOCK',
  COUPON_EXPIRING = 'COUPON_EXPIRING',
  COUPON_STARTED = 'COUPON_STARTED',
  NEW_REVIEW = 'NEW_REVIEW',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Configurar según tu frontend
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  
  // Mapa de usuarios conectados: userId -> socketId
  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      this.connectedUsers.set(userId, client.id);
      this.logger.log(`Usuario ${userId} conectado (socket: ${client.id})`);
      
      // Unir al usuario a una sala con su ID
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Encontrar y eliminar usuario desconectado
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        this.logger.log(`Usuario ${userId} desconectado`);
        break;
      }
    }
  }

  /**
   * Enviar notificación a un usuario específico
   */
  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notificación enviada a usuario ${userId}: ${notification.type}`);
  }

  /**
   * Enviar notificación de nuevo pedido
   */
  notifyNewOrder(userId: string, order: any) {
    const notification: Notification = {
      id: `order-${order.id}`,
      type: NotificationType.NEW_ORDER,
      title: '🎉 ¡Nuevo pedido!',
      message: `${order.customerName} hizo un pedido de S/. ${order.total.toFixed(2)}`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Notificar stock bajo
   */
  notifyLowStock(userId: string, product: any) {
    const notification: Notification = {
      id: `low-stock-${product.id}`,
      type: NotificationType.LOW_STOCK,
      title: '⚠️ Stock bajo',
      message: `"${product.name}" tiene solo ${product.stock} unidades disponibles`,
      data: { productId: product.id },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Notificar producto agotado
   */
  notifyOutOfStock(userId: string, product: any) {
    const notification: Notification = {
      id: `out-stock-${product.id}`,
      type: NotificationType.PRODUCT_OUT_OF_STOCK,
      title: '🚫 Producto agotado',
      message: `"${product.name}" se ha agotado`,
      data: { productId: product.id },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Notificar cupón por expirar
   */
  notifyCouponExpiring(userId: string, coupon: any, hoursLeft: number) {
    const notification: Notification = {
      id: `coupon-expiring-${coupon.id}`,
      type: NotificationType.COUPON_EXPIRING,
      title: '⏰ Cupón por expirar',
      message: `El cupón "${coupon.code}" expira en ${hoursLeft} horas`,
      data: { couponId: coupon.id },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Notificar cupón activado
   */
  notifyCouponStarted(userId: string, coupon: any) {
    const notification: Notification = {
      id: `coupon-started-${coupon.id}`,
      type: NotificationType.COUPON_STARTED,
      title: '✨ Cupón activado',
      message: `El cupón "${coupon.code}" ya está disponible para tus clientes`,
      data: { couponId: coupon.id },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Notificar nueva reseña
   */
  notifyNewReview(userId: string, review: any) {
    const stars = '⭐'.repeat(review.rating);
    const notification: Notification = {
      id: `review-${review.id}`,
      type: NotificationType.NEW_REVIEW,
      title: '💬 Nueva reseña',
      message: `${review.customer.fullName} te dejó ${stars}`,
      data: { reviewId: review.id },
      timestamp: new Date(),
      read: false,
    };

    this.sendNotificationToUser(userId, notification);
  }

  /**
   * Obtener usuarios conectados
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Verificar si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}