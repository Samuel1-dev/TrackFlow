import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimeLogDto } from './dto/create-time-log.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private prisma: PrismaService) {}

  private async ensureTaskOwnership(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, userId: true, title: true, estimatedMinutes: true },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');
    if (task.userId !== userId)
      throw new ForbiddenException('Accès interdit à cette tâche');
    return task;
  }

  async addTimeLog(userId: string, taskId: string, dto: CreateTimeLogDto) {
    await this.ensureTaskOwnership(userId, taskId);

    const log = await this.prisma.timeLog.create({
      data: {
        userId,
        taskId,
        durationMinutes: dto.durationMinutes,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        notes: dto.notes,
      },
    });

    // Calcul du total logué pour cette tâche
    const { _sum } = await this.prisma.timeLog.aggregate({
      where: { taskId },
      _sum: { durationMinutes: true },
    });

    return {
      ...log,
      totalLoggedMinutes: _sum.durationMinutes ?? 0,
    };
  }

  async getTimeLogsForTask(userId: string, taskId: string) {
    await this.ensureTaskOwnership(userId, taskId);

    const logs = await this.prisma.timeLog.findMany({
      where: { taskId, userId },
      orderBy: { startedAt: 'desc' },
    });

    const { _sum } = await this.prisma.timeLog.aggregate({
      where: { taskId },
      _sum: { durationMinutes: true },
    });

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { estimatedMinutes: true },
    });

    const totalLogged = _sum.durationMinutes ?? 0;
    const estimated = task?.estimatedMinutes ?? 0;

    return {
      logs,
      totalLoggedMinutes: totalLogged,
      estimatedMinutes: estimated,
      varianceMinutes: totalLogged - estimated,
      isOverEstimate: totalLogged > estimated && estimated > 0,
    };
  }

  async deleteTimeLog(userId: string, logId: string) {
    const log = await this.prisma.timeLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Session de travail introuvable');
    if (log.userId !== userId)
      throw new ForbiddenException('Accès interdit à cette session');

    await this.prisma.timeLog.delete({ where: { id: logId } });
    return { message: 'Session de travail supprimée' };
  }
}
