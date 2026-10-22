import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Finance - Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @ApiOperation({ summary: 'Créer un nouveau budget pour une période' })
  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(userId, dto);
  }

  @ApiOperation({
    summary: 'Récupérer le budget actif avec tous les indicateurs calculés',
    description:
      'Retourne : budget initial, objectif d\'épargne, budget disponible pour les dépenses, total dépensé, budget restant, épargne estimée, écart à l\'objectif, répartition des dépenses par catégorie.',
  })
  @Get('active')
  getActiveBudget(@CurrentUser('userId') userId: string) {
    return this.budgetsService.getActiveBudget(userId);
  }

  @ApiOperation({ summary: 'Historique paginé des budgets passés avec bilans finaux' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('history')
  getHistory(
    @CurrentUser('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.budgetsService.getHistory(userId, page, limit);
  }

  @ApiOperation({ summary: 'Récupérer un budget spécifique avec ses indicateurs' })
  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.findOne(userId, id);
  }

  @ApiOperation({ summary: 'Mettre à jour un budget existant' })
  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(userId, id, dto);
  }

  @ApiOperation({ summary: 'Supprimer un budget' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.budgetsService.remove(userId, id);
  }
}
