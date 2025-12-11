import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserVerificationService {
  constructor(private prisma: PrismaService) {}

  async requestVerification(userId: string, documents: any) {
    // Lógica para solicitar verificación
    // Por ahora solo actualiza el estado
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: 'PENDING',
      },
    });
  }

  async approveVerification(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationStatus: 'APPROVED',
      },
    });
  }

  async rejectVerification(userId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: false,
        verificationStatus: 'REJECTED',
      },
    });
  }
}