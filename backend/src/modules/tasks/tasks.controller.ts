import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Créer une nouvelle tâche (ou sous-tâche)' })
  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Lister toutes les tâches avec filtres' })
  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() filters: FilterTasksDto,
  ) {
    return this.tasksService.findAll(userId, filters);
  }

  @ApiOperation({ summary: 'Récupérer les statistiques de productivité hebdomadaire' })
  @Get('weekly-stats')
  getWeeklyStats(@CurrentUser('userId') userId: string) {
    return this.tasksService.getWeeklyStats(userId);
  }

  @ApiOperation({ summary: 'Récupérer le détail complet d\'une tâche' })
  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(userId, id);
  }

  @ApiOperation({ summary: 'Modifier une tâche' })
  @Put(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(userId, id, dto);
  }

  @ApiOperation({
    summary: 'Changer le statut d\'une tâche',
    description:
      'Vérifie les transitions autorisées et bloque si des dépendances prérequises ne sont pas terminées',
  })
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(userId, id, dto);
  }

  @ApiOperation({ summary: 'Supprimer une tâche' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(userId, id);
  }
}
