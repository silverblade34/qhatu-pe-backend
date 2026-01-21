import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService) { }

  /**
   * Genera el mensaje de WhatsApp con los detalles del pedido
   * El cliente puede pedir 1 producto o varios (carrito)
   */
  async generateWhatsAppMessage(createOrderDto: CreateOrderDto) {
    const { items, couponCode, customerInfo } = createOrderDto;

    // Validar que todos los productos existan y tengan stock
    const productIds = [...new Set(items.map(item => item.productId))];

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        variants: true,
        user: {
          select: {
            username: true,
            storeProfile: {
              select: {
                storeName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no están disponibles');
    }

    // Validar stock para cada producto/variante
    let subtotal = 0;
    const itemsDetails = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);

      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(
            `Variante no encontrada para ${product.name}`,
          );
        }
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name} - ${variant.name}`,
          );
        }
        const price = variant.price || product.price;
        subtotal += price * item.quantity;
        itemsDetails.push({
          name: product.name,
          variant: variant.name,
          price,
          quantity: item.quantity,
          subtotalItem: price * item.quantity,
        });
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}`,
          );
        }
        subtotal += product.price * item.quantity;
        itemsDetails.push({
          name: product.name,
          variant: null,
          price: product.price,
          quantity: item.quantity,
          subtotalItem: product.price * item.quantity,
        });
      }
    }

    // Aplicar cupón si existe
    let discount = 0;
    let couponInfo = null;

    if (couponCode) {
      const coupon = await this.validateAndGetCoupon(
        products[0].userId,
        couponCode,
        subtotal,
        productIds,
      );

      if (coupon) {
        discount = this.calculateDiscount(coupon, subtotal);
        couponInfo = {
          code: coupon.code,
          discount,
        };
      }
    }

    const total = subtotal - discount;
    const sellerUsername = products[0].user.username;
    const storeName = products[0].user.storeProfile?.storeName || sellerUsername;
    const storePhone = products[0].user.storeProfile?.phone;

    // Construir mensaje de WhatsApp
    let message = `¡Hola *${storeName}*! Me interesa:\n\n`;

    itemsDetails.forEach((item, index) => {
      message += `*Producto ${index + 1}:* ${item.name}\n`;
      if (item.variant) {
        message += `   Variante: ${item.variant}\n`;
      }
      message += `   Precio: S/. ${item.price.toFixed(2)}\n`;
      message += `   Cantidad: ${item.quantity}\n`;
      message += `   Subtotal: S/. ${item.subtotalItem.toFixed(2)}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Subtotal:* S/. ${subtotal.toFixed(2)}\n`;

    if (couponInfo) {
      message += `*Cupón ${couponInfo.code}:* -S/. ${couponInfo.discount.toFixed(2)}\n`;
    }

    message += `*TOTAL:* S/. ${total.toFixed(2)}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    if (customerInfo) {
      message += `*Cliente:* ${customerInfo.name}\n`;
      if (customerInfo.phone) {
        message += `*Teléfono:* ${customerInfo.phone}\n`;
      }
      if (customerInfo.address) {
        message += `*Dirección:* ${customerInfo.address}\n`;
      }
    }

    message += `\nVer productos: https://www.qhatupe.com/${sellerUsername}`;

    // Generar link de WhatsApp
    const whatsappNumber = storePhone || ''; // El teléfono debe incluirse
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    return {
      message,
      whatsappLink,
      orderSummary: {
        items: itemsDetails,
        subtotal,
        discount,
        total,
        coupon: couponInfo,
        seller: {
          username: sellerUsername,
          storeName,
          phone: storePhone,
        },
      },
    };
  }

  async create(createOrderDto: CreateOrderDto) {
    const { items, couponCode, customerInfo, paymentMethod } = createOrderDto;

    // Validar productos y calcular totales FUERA de la transacción
    const productIds = [...new Set(items.map(item => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: createOrderDto.storeUserId,
        isActive: true,
      },
      include: {
        variants: true,
        user: {
          select: {
            username: true,
            storeProfile: {
              select: {
                storeName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no están disponibles');
    }

    let subtotal = 0;
    const orderItems = [];
    const itemsDetails = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      let price = product.price;
      let variantName = null;

      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (!variant || variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}`,
          );
        }
        price = variant.price || product.price;
        variantName = variant.name;
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}`,
          );
        }
      }

      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        variantName,
        quantity: item.quantity,
        unitPrice: price,
        subtotal: itemSubtotal,
      });

      itemsDetails.push({
        name: product.name,
        variant: variantName,
        price,
        quantity: item.quantity,
        subtotalItem: itemSubtotal,
      });
    }

    // Aplicar cupón FUERA de la transacción
    let discount = 0;
    let couponId = null;
    let couponInfo = null;

    if (couponCode) {
      const coupon = await this.validateAndGetCoupon(
        createOrderDto.storeUserId,
        couponCode,
        subtotal,
        productIds,
      );

      if (coupon) {
        discount = this.calculateDiscount(coupon, subtotal);
        couponId = coupon.id;
        couponInfo = {
          code: coupon.code,
          discount,
        };
      }
    }

    const total = subtotal - discount;

    // Generar número de orden ANTES de la transacción
    const orderNumber = await this.generateOrderNumber();

    // TRANSACCIÓN MÁS CORTA Y EFICIENTE
    const order = await this.prisma.$transaction(
      async (tx) => {
        // Crear orden
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: createOrderDto.storeUserId,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            customerEmail: customerInfo.email,
            deliveryAddress: customerInfo.address,
            deliveryNotes: customerInfo.notes,
            status: OrderStatus.PENDING,
            paymentMethod,
            paymentStatus: PaymentStatus.PENDING,
            subtotal,
            discount,
            total,
            couponId,
            items: {
              create: orderItems,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { take: 1 },
                  },
                },
              },
            },
            coupon: true,
          },
        });

        // Actualizar uso del cupón y stock en paralelo
        const updates = [];

        if (couponId) {
          updates.push(
            tx.coupon.update({
              where: { id: couponId },
              data: { usageCount: { increment: 1 } },
            })
          );
        }

        // Reducir stock de productos/variantes
        for (const item of items) {
          if (item.variantId) {
            updates.push(
              tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { decrement: item.quantity } },
              })
            );
          } else {
            updates.push(
              tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              })
            );
          }
        }

        await Promise.all(updates);

        return newOrder;
      },
      {
        maxWait: 10000, // Espera máxima para adquirir una conexión (10s)
        timeout: 30000, // Timeout de la transacción (30s)
        isolationLevel: 'ReadCommitted', // Nivel de aislamiento menos restrictivo
      }
    );

    // Notificación FUERA de la transacción (async, no bloqueante)
    this.notificationsService.notifyNewOrder(order.id).catch(err => {
      console.error('Error sending notification:', err);
    });

    // Resto del código para generar mensaje de WhatsApp...
    const sellerUsername = products[0].user.username;
    const storeName = products[0].user.storeProfile?.storeName || sellerUsername;
    const storePhone = products[0].user.storeProfile?.phone;

    let message = `*Pedido Confirmado #${orderNumber}*\n\n`;
    message += `¡Hola *${storeName}*! Tu pedido ha sido registrado:\n\n`;

    itemsDetails.forEach((item, index) => {
      message += `*Producto ${index + 1}:* ${item.name}\n`;
      if (item.variant) {
        message += `   Variante: ${item.variant}\n`;
      }
      message += `   Precio: S/. ${item.price.toFixed(2)}\n`;
      message += `   Cantidad: ${item.quantity}\n`;
      message += `   Subtotal: S/. ${item.subtotalItem.toFixed(2)}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━\n`;
    message += `*Subtotal:* S/. ${subtotal.toFixed(2)}\n`;

    if (couponInfo) {
      message += `*Cupón ${couponInfo.code}:* -S/. ${couponInfo.discount.toFixed(2)}\n`;
    }

    message += `*TOTAL:* S/. ${total.toFixed(2)}\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    if (customerInfo) {
      message += `*Cliente:* ${customerInfo.name}\n`;
      if (customerInfo.phone) {
        message += `*Teléfono:* ${customerInfo.phone}\n`;
      }
      if (customerInfo.address) {
        message += `*Dirección:* ${customerInfo.address}\n`;
      }
    }

    message += `\nVer productos: https://www.qhatupe.com/${sellerUsername}`;

    const whatsappNumber = storePhone || '';
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    return {
      order,
      whatsappLink,
      message,
      orderSummary: {
        orderNumber,
        items: itemsDetails,
        subtotal,
        discount,
        total,
        coupon: couponInfo,
        seller: {
          username: sellerUsername,
          storeName,
          phone: storePhone,
        },
      },
    };
  }

  async updateStatus(
    userId: string,
    orderId: string,
    updateDto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para modificar esta orden');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: updateDto.status,
        paymentStatus: updateDto.paymentStatus,
        ...(updateDto.status === OrderStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1 } },
            },
          },
        },
      },
    });

    return updatedOrder;
  }

  async getSellerOrders(userId: string, filters: FilterOrderDto) {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate && { gte: new Date(filters.startDate) }),
        ...(filters.endDate && { lte: new Date(filters.endDate) }),
      };
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              include: { images: { take: 1 } },
            },
          },
        },
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });

    const total = await this.prisma.order.count({ where });

    return {
      data: orders,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        coupon: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver esta orden');
    }

    return order;
  }

  async getSellerStats(userId: string) {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      todayRevenue,
    ] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.count({
        where: { userId, status: OrderStatus.PENDING },
      }),
      this.prisma.order.count({
        where: { userId, status: OrderStatus.DELIVERED },
      }),
      this.prisma.order.aggregate({
        where: {
          userId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: {
          userId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.PAID,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      todayRevenue: todayRevenue._sum.total || 0,
    };
  }

  // Métodos privados auxiliares

  private async validateAndGetCoupon(
    userId: string,
    code: string,
    subtotal: number,
    productIds: string[],
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        userId,
        code: code.toUpperCase(),
        status: 'ACTIVE',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new BadRequestException('Cupón no válido o expirado');
    }

    // Validar límite de uso
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Este cupón ha alcanzado su límite de uso');
    }

    // Validar monto mínimo
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      throw new BadRequestException(
        `Compra mínima de S/. ${coupon.minPurchase} requerida`,
      );
    }

    // Validar productos específicos
    if (coupon.productIds.length > 0) {
      const hasValidProduct = productIds.some(id =>
        coupon.productIds.includes(id),
      );
      if (!hasValidProduct) {
        throw new BadRequestException(
          'Este cupón no aplica para los productos seleccionados',
        );
      }
    }

    return coupon;
  }

  private calculateDiscount(coupon: any, subtotal: number): number {
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;

      // Aplicar descuento máximo si existe
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // FIXED
      discount = coupon.discountValue;
    }

    // El descuento no puede ser mayor al subtotal
    return Math.min(discount, subtotal);
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `ORD-${year}${month}${day}-${timestamp}${random}`;

        const exists = await this.prisma.order.findUnique({
          where: { orderNumber },
          select: { id: true },
        });

        if (!exists) {
          return orderNumber;
        }

        attempts++;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error('No se pudo generar un número de orden único');
  }
}