import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeTrackingService } from './time-tracking.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Time Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/time-logs')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @ApiOperation({ summary: 'Ajouter une session de travail à une tâche' })
  @Post()
  addTimeLog(
    @CurrentUser('userId') userId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTimeLogDto,
  ) {
    return this.timeTrackingService.addTimeLog(userId, taskId, dto);
  }

  @ApiOperation({ summary: 'Lister les sessions de travail d\'une tâche avec total et écart' })
  @Get()
  getTimeLogs(
    @CurrentUser('userId') userId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.timeTrackingService.getTimeLogsForTask(userId, taskId);
  }

  @ApiOperation({ summary: 'Supprimer une session de travail' })
  @Delete(':logId')
  @HttpCode(HttpStatus.OK)
  deleteTimeLog(
    @CurrentUser('userId') userId: string,
    @Param('logId', ParseUUIDPipe) logId: string,
  ) {
    return this.timeTrackingService.deleteTimeLog(userId, logId);
  }
}
