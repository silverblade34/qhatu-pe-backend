import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Plan } from '@prisma/client';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  // ============================================
  // ENDPOINTS PARA USUARIOS
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get('my-next-payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener próximo pago pendiente' })
  async getMyNextPayment(@CurrentUser() user: any) {
    return this.billingService.getNextPaymentDue(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener historial de pagos' })
  async getMyBillingHistory(@CurrentUser() user: any) {
    return this.billingService.getBillingHistory(user.id);
  }

  // ============================================
  // ENDPOINTS PARA ADMIN
  // ============================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/assign-promotional-plan')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Asignar plan promocional a usuario' })
  async assignPromotionalPlan(
    @Body()
    body: {
      userId: string;
      plan: Plan;
      durationMonths: number;
      freeMonths?: number;
    },
  ) {
    return this.billingService.assignPromotionalPlan(
      body.userId,
      body.plan,
      body.durationMonths,
      body.freeMonths || 1,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/mark-as-paid/:recordId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Marcar pago como completado' })
  async markAsPaid(
    @Param('recordId') recordId: string,
    @Body()
    body: {
      paymentMethod: string;
      receiptUrl?: string;
      transactionId?: string;
      adminNotes?: string;
    },
  ) {
    return this.billingService.markAsPaid(
      recordId,
      body.paymentMethod,
      body.receiptUrl,
      body.transactionId,
      body.adminNotes,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/user/:userId/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Ver historial de un usuario' })
  async getUserBillingHistory(@Param('userId') userId: string) {
    return this.billingService.getBillingHistory(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/check-overdue')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Verificar y procesar pagos vencidos' })
  async checkOverduePayments() {
    return this.billingService.checkOverduePayments();
  }
}