import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Plan } from '@prisma/client';
import { VercelService } from '../vercel/vercel.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService, private vercelService: VercelService) { }

  /**
   * Crear registros de facturación para los próximos 12 meses
   */
  async generateBillingRecordsForYear(
    userId: string,
    plan: Plan,
    startDate: Date,
    isPromotion = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { billingDayOfMonth: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const billingDay = user.billingDayOfMonth || 1;
    const records = [];

    // Generar 12 registros mensuales
    for (let i = 0; i < 12; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(billingDay);

      const billingPeriod = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

      // Precio según el plan
      const amount = plan === 'PRO' ? 29.0 : plan === 'PREMIUM' ? 49.0 : 0;

      records.push({
        userId,
        plan,
        billingPeriod,
        dueDate,
        amount,
        currency: 'PEN',
        status: i === 0 && isPromotion ? 'WAIVED' : 'PENDING', // Primer mes gratis si es promoción
        isPromotion: i === 0 && isPromotion,
      });
    }

    // Crear todos los registros
    await this.prisma.billingRecord.createMany({
      data: records,
      skipDuplicates: true,
    });

    return {
      message: `Se generaron ${records.length} registros de facturación`,
      records: records.length,
    };
  }

  /**
   * Obtener el próximo pago pendiente del usuario
   */
  async getNextPaymentDue(userId: string) {
    const nextPayment = await this.prisma.billingRecord.findFirst({
      where: {
        userId,
        status: 'PENDING',
        dueDate: { gte: new Date() },
      },
      orderBy: { dueDate: 'asc' },
    });

    if (!nextPayment) {
      return null;
    }

    const daysUntilDue = Math.ceil(
      (nextPayment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return {
      ...nextPayment,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      isNearDue: daysUntilDue <= 7, // Menos de 7 días
    };
  }

  /**
   * Obtener historial de pagos del usuario
   */
  async getBillingHistory(userId: string) {
    return this.prisma.billingRecord.findMany({
      where: { userId },
      orderBy: { dueDate: 'desc' },
    });
  }

  /**
   * Marcar un pago como pagado (ADMIN)
   */
  async markAsPaid(
    recordId: string,
    paymentMethod: string,
    receiptUrl?: string,
    transactionId?: string,
    adminNotes?: string,
  ) {
    const record = await this.prisma.billingRecord.findUnique({
      where: { id: recordId },
      include: { user: true },
    });

    if (!record) {
      throw new NotFoundException('Registro de facturación no encontrado');
    }

    if (record.status === 'PAID') {
      throw new BadRequestException('Este pago ya fue registrado');
    }

    // Actualizar registro
    await this.prisma.billingRecord.update({
      where: { id: recordId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod,
        receiptUrl,
        transactionId,
        adminNotes,
      },
    });

    // Actualizar estado del usuario
    await this.prisma.user.update({
      where: { id: record.userId },
      data: {
        hasUnpaidBilling: false,
      },
    });

    return {
      message: 'Pago registrado exitosamente',
      record,
    };
  }

  /**
   * Verificar pagos vencidos y downgrade automático
   */
  async checkOverduePayments() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Buscar pagos vencidos hace más de 2 días
    const overdueRecords = await this.prisma.billingRecord.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: twoDaysAgo },
      },
      include: { user: true },
    });

    for (const record of overdueRecords) {
      // Marcar como vencido
      await this.prisma.billingRecord.update({
        where: { id: record.id },
        data: {
          status: 'OVERDUE',
          expiredAt: new Date(),
        },
      });

      // Downgrade a BASIC
      await this.prisma.user.update({
        where: { id: record.userId },
        data: {
          plan: 'BASIC',
          hasUnpaidBilling: true,
        },
      });

      console.log(`Usuario ${record.user.username} fue downgradeado a BASIC por falta de pago`);
    }

    return {
      message: `Se procesaron ${overdueRecords.length} pagos vencidos`,
      downgraded: overdueRecords.length,
    };
  }

  /**
   * Asignar plan PRO/PREMIUM con promoción (ADMIN)
   */
  async assignPromotionalPlan(
    userId: string,
    plan: Plan,
    durationMonths: number,
    freeMonths: number = 1,
  ) {
    if (plan === 'BASIC') {
      throw new BadRequestException('No se puede asignar plan BASIC como promoción');
    }

    const startDate = new Date();
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // Actualizar usuario
    const updateUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planStartDate: startDate,
        planExpiresAt: expiresAt,
        hasUnpaidBilling: false,
      },
    });

    // Generar registros de facturación
    await this.generateBillingRecordsForYear(
      userId,
      plan,
      startDate,
      freeMonths > 0,
    );

    const subdomain = await this.vercelService.createSubdomain(updateUser.username);

    await this.prisma.storeProfile.upsert({
      where: { userId },
      update: {
        profileUrl: `https://${subdomain}`,
      },
      create: {
        userId,
        storeName: updateUser.username,
        profileUrl: `https://${subdomain}`,
      },
    });

    return {
      message: `Plan ${plan} asignado con ${freeMonths} mes(es) gratis`,
      plan,
      expiresAt,
    };
  }
}