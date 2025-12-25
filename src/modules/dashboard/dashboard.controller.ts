import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats
   * Obtiene todas las estadísticas del dashboard
   */
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.dashboardService.getDashboardStats(user.id);
  }

  /**
   * GET /dashboard/basic-stats
   * Obtiene solo estadísticas básicas (más rápido)
   * Útil para polling/actualizaciones frecuentes
   */
  @Get('basic-stats')
  async getBasicStats(@CurrentUser() user: any) {
    return this.dashboardService.getBasicStats(user.id);
  }

  /**
   * GET /dashboard/alerts
   * Obtiene alertas importantes
   */
  @Get('alerts')
  async getAlerts(@CurrentUser() user: any) {
    return this.dashboardService.getAlerts(user.id);
  }
}