import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

export interface DashboardStats {
  totalProducts: number;
  pendingOrders: number;
  activeCoupons: number;
  averageRating: number;
  recentOrders: RecentOrder[];
  last7DaysOrders: DayOrderCount[];
  lowStockProducts: LowStockProduct[];
  topSellingProducts: TopProduct[];
  salesSummary: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

interface DayOrderCount {
  date: string;
  count: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
}

interface TopProduct {
  id: string;
  name: string;
  totalSold: number;
  revenue: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene todas las estadísticas del dashboard con queries optimizadas
   * usando Promise.all para ejecutar queries en paralelo
   */
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ejecutar todas las queries en PARALELO para optimizar performance
    const [
      totalProducts,
      pendingOrders,
      activeCoupons,
      ratings,
      recentOrders,
      ordersLast7Days,
      lowStockProducts,
      topProducts,
      salesToday,
      salesWeek,
      salesMonth,
    ] = await Promise.all([
      // 1. Total de productos activos
      this.prisma.product.count({
        where: { userId, isActive: true },
      }),

      // 2. Pedidos pendientes
      this.prisma.order.count({
        where: {
          userId,
          status: OrderStatus.PENDING,
        },
      }),

      // 3. Cupones activos
      this.prisma.coupon.count({
        where: {
          userId,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),

      // 4. Calificaciones promedio
      this.prisma.review.aggregate({
        where: { sellerId: userId },
        _avg: { rating: true },
      }),

      // 5. Últimos 5 pedidos
      this.prisma.order.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            take: 1,
            include: { product: true },
          },
        },
      }),

      // 6. Pedidos de los últimos 7 días (agrupados por día)
      this.prisma.order.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: last7Days },
        },
        _count: true,
      }),

      // 7. Productos con stock bajo
      this.prisma.product.findMany({
        where: {
          userId,
          isActive: true,
          stock: {
            lte: this.prisma.product.fields.lowStockThreshold,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          lowStockThreshold: true,
        },
        take: 10,
        orderBy: { stock: 'asc' },
      }),

      // 8. Productos más vendidos (últimos 30 días)
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            userId,
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            status: { not: OrderStatus.CANCELLED },
          },
        },
        _sum: {
          quantity: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),

      // 9. Ventas de hoy
      this.prisma.order.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfToday },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
      }),

      // 10. Ventas de esta semana
      this.prisma.order.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfWeek },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
      }),

      // 11. Ventas de este mes
      this.prisma.order.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
      }),
    ]);

    // Procesar datos de últimos 7 días para el gráfico
    const last7DaysData = this.processLast7DaysOrders(ordersLast7Days);

    // Obtener nombres de productos top
    const topProductsWithNames = await this.getTopProductsWithNames(topProducts);

    // Formatear pedidos recientes
    const formattedRecentOrders: RecentOrder[] = recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      productName: order.items[0]?.productName || 'Sin productos',
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }));

    return {
      totalProducts,
      pendingOrders,
      activeCoupons,
      averageRating: ratings._avg.rating || 0,
      recentOrders: formattedRecentOrders,
      last7DaysOrders: last7DaysData,
      lowStockProducts,
      topSellingProducts: topProductsWithNames,
      salesSummary: {
        today: salesToday._sum.total || 0,
        thisWeek: salesWeek._sum.total || 0,
        thisMonth: salesMonth._sum.total || 0,
      },
    };
  }

  /**
   * Obtiene solo las estadísticas básicas (para actualizaciones frecuentes)
   */
  async getBasicStats(userId: string) {
    const [totalProducts, pendingOrders, activeCoupons] = await Promise.all([
      this.prisma.product.count({
        where: { userId, isActive: true },
      }),
      this.prisma.order.count({
        where: { userId, status: OrderStatus.PENDING },
      }),
      this.prisma.coupon.count({
        where: {
          userId,
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      }),
    ]);

    return { totalProducts, pendingOrders, activeCoupons };
  }

  /**
   * Procesa los pedidos de los últimos 7 días para el gráfico
   */
  private processLast7DaysOrders(orders: any[]): DayOrderCount[] {
    const last7Days: DayOrderCount[] = [];
    const now = new Date();

    // Crear array con los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const count = orders.filter((order) => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      }).length;

      last7Days.push({
        date: this.formatDayName(date),
        count,
      });
    }

    return last7Days;
  }

  /**
   * Formatea el nombre del día
   */
  private formatDayName(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  }

  /**
   * Obtiene los nombres de los productos más vendidos
   */
  private async getTopProductsWithNames(topProducts: any[]): Promise<TopProduct[]> {
    const productIds = topProducts.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    return topProducts.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Producto desconocido',
        totalSold: item._sum.quantity || 0,
        revenue: item._sum.subtotal || 0,
      };
    });
  }

  /**
   * Obtiene alertas importantes para el vendedor
   */
  async getAlerts(userId: string) {
    const [lowStock, expiringCoupons, pendingOrders] = await Promise.all([
      // Productos con stock crítico (menos de 3)
      this.prisma.product.count({
        where: {
          userId,
          isActive: true,
          stock: { lte: 3 },
        },
      }),

      // Cupones que expiran en las próximas 24 horas
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

      // Pedidos pendientes de más de 2 horas
      this.prisma.order.count({
        where: {
          userId,
          status: OrderStatus.PENDING,
          createdAt: {
            lte: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      lowStock,
      expiringCoupons,
      pendingOrders,
      total: lowStock + expiringCoupons + pendingOrders,
    };
  }
}