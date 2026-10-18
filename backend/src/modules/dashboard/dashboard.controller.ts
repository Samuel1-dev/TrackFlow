import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Tableau de bord unifié : productivité + finances',
    description:
      'Retourne en une seule requête optimisée : tâches du jour, urgentes, en retard, bloquées, projets actifs avec progression, résumé hebdomadaire de productivité, budget actif avec tous les indicateurs financiers et répartition des dépenses.',
  })
  @Get('summary')
  getSummary(@CurrentUser('userId') userId: string) {
    return this.dashboardService.getSummary(userId);
  }
}
