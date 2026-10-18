import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateTimeLogDto {
  @ApiProperty({ example: 45, description: 'Durée en minutes' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ example: '2026-10-16T09:00:00.000Z', description: 'Début de la session' })
  @IsNotEmpty()
  @IsDateString()
  startedAt: string;

  @ApiPropertyOptional({ example: '2026-10-16T09:45:00.000Z', description: 'Fin de la session' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({ example: 'Implémentation de la validation des formulaires' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
