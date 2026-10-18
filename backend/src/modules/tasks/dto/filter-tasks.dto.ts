import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsString,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class FilterTasksDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filtrer par projet' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Mot-clé de recherche dans le titre ou la description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer uniquement les tâches en retard' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer uniquement les tâches bloquées (statut BLOCKED ou avec dépendances non terminées)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer les tâches dont l\'échéance est à partir de cette date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filtrer les tâches dont l\'échéance est avant cette date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Filtrer uniquement les tâches du jour' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  today?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer uniquement les tâches sans projet (orphelines)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  noProject?: boolean;
}
