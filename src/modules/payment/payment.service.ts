import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPayment(userId: string, data: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        ...data,
        userId,
        status: 'PENDING',
      },
    });
  }

  async confirmPayment(paymentId: string, transactionId: string, receiptUrl?: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        transactionId,
        receiptUrl,
        paidAt: new Date(),
      },
    });
  }

  async failPayment(paymentId: string, reason?: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        metadata: { reason },
      },
    });
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { subscription: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}