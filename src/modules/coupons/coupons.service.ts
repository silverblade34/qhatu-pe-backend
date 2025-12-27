import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponStatus } from '@prisma/client';
import { FilterCouponDto } from './dto/filter-coupon.dto';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class CouponsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService
  ) { }

  async create(userId: string, createCouponDto: CreateCouponDto) {
    // Verificar límite de cupones según plan
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    // Validar que el plan tenga acceso a cupones
    const planFeatures = this.subscriptionService.getPlanFeatures(user.plan);

    if (!planFeatures.canUseCoupons) {
      const nextPlan = this.subscriptionService.getNextPlan(user.plan);
      throw new BadRequestException(
        `Los cupones no están disponibles en tu plan ${user.plan}. ${nextPlan ? `Actualiza a ${nextPlan} para usar esta función.` : ''
        }`,
      );
    }

    const activeCoupons = await this.prisma.coupon.count({
      where: {
        userId,
        status: CouponStatus.ACTIVE,
      },
    });

    // Validar límite de cupones activos
    try {
      this.subscriptionService.validateResourceLimit(
        user.plan,
        'maxActiveCoupons',
        activeCoupons,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    // Verificar que el código no exista ya para este vendedor
    const existingCoupon = await this.prisma.coupon.findFirst({
      where: {
        userId,
        code: createCouponDto.code.toUpperCase(),
      },
    });

    if (existingCoupon) {
      throw new ConflictException('Ya existe un cupón con este código');
    }

    // Validar productos si se especifican
    if (createCouponDto.productIds && createCouponDto.productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: createCouponDto.productIds },
          userId,
        },
      });

      if (products.length !== createCouponDto.productIds.length) {
        throw new BadRequestException('Uno o más productos no son válidos');
      }
    }

    // Validar fechas
    const startDate = new Date(createCouponDto.startDate);
    const endDate = new Date(createCouponDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Validar valores según tipo de descuento
    if (createCouponDto.discountType === 'PERCENTAGE') {
      if (
        createCouponDto.discountValue <= 0 ||
        createCouponDto.discountValue > 100
      ) {
        throw new BadRequestException(
          'El porcentaje debe estar entre 1 y 100',
        );
      }
    } else {
      if (createCouponDto.discountValue <= 0) {
        throw new BadRequestException('El descuento debe ser mayor a 0');
      }
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        userId,
        code: createCouponDto.code.toUpperCase(),
        discountType: createCouponDto.discountType,
        discountValue: createCouponDto.discountValue,
        minPurchase: createCouponDto.minPurchase,
        maxDiscount: createCouponDto.maxDiscount,
        usageLimit: createCouponDto.usageLimit,
        productIds: createCouponDto.productIds || [],
        startDate,
        endDate,
        status: CouponStatus.ACTIVE,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return coupon;
  }

  async update(
    userId: string,
    couponId: string,
    updateCouponDto: UpdateCouponDto,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para editar este cupón',
      );
    }

    // No permitir editar cupones que ya fueron usados
    if (coupon.usageCount > 0 && updateCouponDto.code) {
      throw new BadRequestException(
        'No puedes cambiar el código de un cupón que ya fue usado',
      );
    }

    // Validar nuevo código si se proporciona
    if (updateCouponDto.code && updateCouponDto.code !== coupon.code) {
      const existingCoupon = await this.prisma.coupon.findFirst({
        where: {
          userId,
          code: updateCouponDto.code.toUpperCase(),
          id: { not: couponId },
        },
      });

      if (existingCoupon) {
        throw new ConflictException(
          'Ya existe un cupón con este código',
        );
      }
    }

    // Validar fechas si se proporcionan
    if (updateCouponDto.startDate || updateCouponDto.endDate) {
      const startDate = updateCouponDto.startDate
        ? new Date(updateCouponDto.startDate)
        : coupon.startDate;
      const endDate = updateCouponDto.endDate
        ? new Date(updateCouponDto.endDate)
        : coupon.endDate;

      if (endDate <= startDate) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }
    }

    const updatedCoupon = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(updateCouponDto.code && {
          code: updateCouponDto.code.toUpperCase(),
        }),
        ...(updateCouponDto.discountType && {
          discountType: updateCouponDto.discountType,
        }),
        ...(updateCouponDto.discountValue !== undefined && {
          discountValue: updateCouponDto.discountValue,
        }),
        ...(updateCouponDto.minPurchase !== undefined && {
          minPurchase: updateCouponDto.minPurchase,
        }),
        ...(updateCouponDto.maxDiscount !== undefined && {
          maxDiscount: updateCouponDto.maxDiscount,
        }),
        ...(updateCouponDto.usageLimit !== undefined && {
          usageLimit: updateCouponDto.usageLimit,
        }),
        ...(updateCouponDto.productIds !== undefined && {
          productIds: updateCouponDto.productIds,
        }),
        ...(updateCouponDto.startDate && {
          startDate: new Date(updateCouponDto.startDate),
        }),
        ...(updateCouponDto.endDate && {
          endDate: new Date(updateCouponDto.endDate),
        }),
        ...(updateCouponDto.status && {
          status: updateCouponDto.status,
        }),
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return updatedCoupon;
  }

  async delete(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este cupón',
      );
    }

    // No permitir eliminar cupones que ya fueron usados
    if (coupon.usageCount > 0) {
      throw new BadRequestException(
        'No puedes eliminar un cupón que ya fue usado. Puedes desactivarlo en su lugar.',
      );
    }

    await this.prisma.coupon.delete({
      where: { id: couponId },
    });

    return { message: 'Cupón eliminado exitosamente' };
  }

  /**
   * Activar/Desactivar cupón rápidamente
   * Útil para lives: "¡Activando cupón LIVE10 ahora!"
   */
  async toggleStatus(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este cupón',
      );
    }

    // Verificar si el cupón está expirado
    if (new Date() > coupon.endDate) {
      throw new BadRequestException(
        'No puedes activar un cupón expirado',
      );
    }

    const newStatus =
      coupon.status === CouponStatus.ACTIVE
        ? CouponStatus.DISABLED
        : CouponStatus.ACTIVE;

    const updatedCoupon = await this.prisma.coupon.update({
      where: { id: couponId },
      data: { status: newStatus },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return {
      ...updatedCoupon,
      message: `Cupón ${newStatus === CouponStatus.ACTIVE ? 'activado' : 'desactivado'} exitosamente`,
    };
  }

  /**
   * Validar un cupón antes de aplicarlo
   * Endpoint público para que el cliente verifique si el cupón es válido
   */
  async validateCoupon(
    username: string,
    code: string,
    subtotal: number,
    productIds: string[],
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        userId: user.id,
        code: code.toUpperCase(),
        status: CouponStatus.ACTIVE,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!coupon) {
      return {
        valid: false,
        message: 'Cupón no válido o expirado',
      };
    }

    // Verificar límite de uso
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: 'Este cupón ha alcanzado su límite de uso',
      };
    }

    // Verificar monto mínimo
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return {
        valid: false,
        message: `Compra mínima de S/. ${coupon.minPurchase.toFixed(2)} requerida`,
        minPurchase: coupon.minPurchase,
      };
    }

    // Verificar productos específicos
    if (coupon.productIds.length > 0) {
      const hasValidProduct = productIds.some(id =>
        coupon.productIds.includes(id),
      );
      if (!hasValidProduct) {
        return {
          valid: false,
          message: 'Este cupón no aplica para los productos seleccionados',
        };
      }
    }

    // Calcular descuento
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, subtotal);

    return {
      valid: true,
      message: 'Cupón aplicado exitosamente',
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount,
      newTotal: subtotal - discount,
    };
  }

  async getSellerCoupons(userId: string, filters: FilterCouponDto) {
    const where: any = { userId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.code = {
        contains: filters.search.toUpperCase(),
        mode: 'insensitive',
      };
    }

    // Filtrar por expiración
    if (filters.includeExpired === false) {
      where.endDate = { gte: new Date() };
    }

    const coupons = await this.prisma.coupon.findMany({
      where,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 20,
      skip: filters.offset || 0,
    });

    const total = await this.prisma.coupon.count({ where });

    // Marcar cupones expirados automáticamente
    const expiredCoupons = coupons.filter(
      c => c.status === CouponStatus.ACTIVE && new Date() > c.endDate,
    );

    if (expiredCoupons.length > 0) {
      await this.prisma.coupon.updateMany({
        where: {
          id: { in: expiredCoupons.map(c => c.id) },
        },
        data: { status: CouponStatus.EXPIRED },
      });

      // Actualizar en memoria
      expiredCoupons.forEach(c => {
        c.status = CouponStatus.EXPIRED;
      });
    }

    return {
      data: coupons,
      total,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    };
  }

  async getCouponById(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            total: true,
            discount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Cupón no encontrado');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este cupón');
    }

    // Incluir productos asociados si existen
    let products = [];
    if (coupon.productIds.length > 0) {
      products = await this.prisma.product.findMany({
        where: {
          id: { in: coupon.productIds },
        },
        select: {
          id: true,
          name: true,
          price: true,
          images: { take: 1 },
        },
      });
    }

    return {
      ...coupon,
      products,
    };
  }

  async getCouponStats(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon || coupon.userId !== userId) {
      throw new NotFoundException('Cupón no encontrado');
    }

    const [totalOrders, totalRevenue, totalDiscount] = await Promise.all([
      this.prisma.order.count({
        where: { couponId },
      }),
      this.prisma.order.aggregate({
        where: { couponId },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { couponId },
        _sum: { discount: true },
      }),
    ]);

    // Calcular tiempo restante
    const now = new Date();
    const timeRemaining = coupon.endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
    const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

    return {
      code: coupon.code,
      status: coupon.status,
      totalUses: totalOrders,
      usageLimit: coupon.usageLimit,
      usagePercentage: coupon.usageLimit
        ? (totalOrders / coupon.usageLimit) * 100
        : null,
      totalRevenue: totalRevenue._sum.total || 0,
      totalDiscount: totalDiscount._sum.discount || 0,
      isExpired: now > coupon.endDate,
      timeRemaining: {
        days: daysRemaining,
        hours: hoursRemaining,
        minutes: minutesRemaining,
        formatted: `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`,
      },
      startDate: coupon.startDate,
      endDate: coupon.endDate,
    };
  }

  /**
   * Obtener cupones activos públicamente (para el catálogo del cliente)
   */
  async getPublicActiveCoupons(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Tienda no encontrada');
    }

    const coupons = await this.prisma.coupon.findMany({
      where: {
        userId: user.id,
        status: CouponStatus.ACTIVE,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        minPurchase: true,
        maxDiscount: true,
        usageLimit: true,
        usageCount: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return coupons;
  }
}